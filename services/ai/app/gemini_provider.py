import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from services.api.app.config import Settings, get_settings
from services.api.app.intake_schemas import IntakeDraft, IntakeNormalizeRequest


LIVE_SYSTEM_INSTRUCTION = """
You are a careful consumer complaint intake assistant for GRAHAK-DRISHTI.
Speak in the language the consumer uses, including English, Hindi, and natural
Hinglish code-switching. Run a guided intake rather than a free-form chat: ask
exactly one short question at a time, wait for the answer, and do not move ahead
by guessing. Follow this order: what happened; company, seller, marketplace, and
product; order references, dates, amounts, payment, and refund; the consumer's
name, tracking contact, and address; support attempts, evidence, and requested
remedy; then consent. When one answer contains one or more details, immediately
call patch_intake_draft for every explicitly stated field before speaking; never
merely acknowledge a captured detail without updating the draft. If the
consumer says "fill the Live draft", "update the draft", or similar, review
the conversation so far and call patch_intake_draft for every fact explicitly
stated in it before continuing. Do not invent names, dates, amounts, order
references, contact details, legal findings, or evidence. If an optional detail is unknown, not
applicable, or the consumer wants to skip it, leave it empty and continue. Ask
address details one at a time and never require more address information than the
consumer is comfortable sharing. After each answer, briefly confirm what was
captured in natural language and ask only for the next missing detail. At the end,
summarize the captured details, invite corrections, and ask explicitly whether the
consumer allows case processing; set case_processing only after an explicit yes.
Treat the consumer's account as an allegation or report, not an established fact.
Use the patch_intake_draft tool only to organize a private editable draft. Never
submit a complaint, contact a seller or authority, or claim that a regulator has
accepted anything. A human must review and confirm every field before official
submission.
""".strip()

PATCH_TOOL_DECLARATION = {
    "name": "patch_intake_draft",
    "description": "Update one explicitly stated field in the private complaint draft.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "operation": {"type": "STRING", "enum": ["set", "append", "remove"]},
            "path": {"type": "STRING"},
            "value": {"type": "STRING"},
        },
        "required": ["path"],
    },
}


class GeminiProviderError(Exception):
    """Base error for failures that should not expose provider details to users."""


class GeminiNotConfiguredError(GeminiProviderError):
    pass


class GeminiInvalidOutputError(GeminiProviderError):
    pass


@dataclass(frozen=True, slots=True)
class LiveToken:
    token: str
    model: str
    expires_at: datetime
    new_session_expires_at: datetime
    config: dict[str, object]


@dataclass(frozen=True, slots=True)
class NormalizedDraft:
    draft: IntakeDraft
    model: str


class GeminiProvider:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _client(self) -> Any:
        if not self.settings.gemini_api_key:
            raise GeminiNotConfiguredError("GEMINI_API_KEY is not configured")
        try:
            from google import genai
        except ImportError as exc:
            raise GeminiProviderError("google-genai is not installed") from exc
        return genai.Client(api_key=self.settings.gemini_api_key)

    def live_config(self) -> dict[str, object]:
        return {
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "system_instruction": LIVE_SYSTEM_INSTRUCTION,
            "tools": [{"function_declarations": [PATCH_TOOL_DECLARATION]}],
        }

    def create_live_token(self) -> LiveToken:
        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=self.settings.gemini_token_ttl_seconds)
        new_session_expires_at = now + timedelta(
            seconds=self.settings.gemini_session_ttl_seconds
        )
        try:
            client = self._client()
            token = client.auth_tokens.create(
                config={
                    "uses": 1,
                    "expire_time": expires_at,
                    "new_session_expire_time": new_session_expires_at,
                    "live_connect_constraints": {
                        "model": self.settings.gemini_live_model,
                        "config": self.live_config(),
                    },
                }
            )
        except GeminiProviderError:
            raise
        except Exception as exc:
            raise GeminiProviderError("Gemini token provisioning failed") from exc

        token_name = getattr(token, "name", None)
        if not isinstance(token_name, str) or not token_name:
            raise GeminiInvalidOutputError("Gemini returned an invalid ephemeral token")
        return LiveToken(
            token=token_name,
            model=self.settings.gemini_live_model,
            expires_at=expires_at,
            new_session_expires_at=new_session_expires_at,
            config=self.live_config(),
        )

    def normalize(self, request: IntakeNormalizeRequest) -> NormalizedDraft:
        if request.transcript and len(request.transcript) > self.settings.gemini_max_transcript_chars:
            raise GeminiInvalidOutputError("transcript exceeds the configured limit")
        prompt = self._normalization_prompt(request)
        try:
            from google.genai import types

            response = self._client().models.generate_content(
                model=self.settings.gemini_extraction_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "Return only a JSON object matching the supplied complaint "
                        "intake schema. Preserve unknown values as null or empty "
                        "lists. Never create legal findings."
                    ),
                    response_mime_type="application/json",
                    response_schema=IntakeDraft.model_json_schema(),
                ),
            )
        except GeminiProviderError:
            raise
        except Exception as exc:
            raise GeminiProviderError("Gemini normalization failed") from exc

        response_text = getattr(response, "text", None)
        if not isinstance(response_text, str) or not response_text.strip():
            raise GeminiInvalidOutputError("Gemini returned no structured intake")
        try:
            parsed = json.loads(response_text)
            draft = IntakeDraft.model_validate(parsed)
        except (TypeError, ValueError, json.JSONDecodeError) as exc:
            raise GeminiInvalidOutputError("Gemini returned invalid structured intake") from exc
        return NormalizedDraft(draft=draft, model=self.settings.gemini_extraction_model)

    @staticmethod
    def _normalization_prompt(request: IntakeNormalizeRequest) -> str:
        draft_json = json.dumps(
            request.draft.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":")
        )
        transcript = request.transcript or ""
        return (
            "Update the current complaint intake draft from the consumer transcript. "
            "Only use information explicitly stated in the transcript; keep existing "
            "values when they are not corrected. Mark uncertain or inferred fields "
            "in provenance with needs_review=true. The language hint is "
            f"{request.language_hint}.\n\nCurrent draft JSON:\n{draft_json}\n\n"
            f"Consumer transcript:\n{transcript}"
        )


def get_gemini_provider() -> GeminiProvider:
    return GeminiProvider()