from services.ai.app.gemini_provider import (
    CONSULTANT_LIVE_SYSTEM_INSTRUCTION,
    GeminiProvider,
    classify_provider_exception,
)
from services.api.app.config import Settings


def test_consultant_live_config_is_advisory_and_has_no_intake_tools() -> None:
    config = GeminiProvider().live_config("consultant")

    assert config["system_instruction"] == CONSULTANT_LIVE_SYSTEM_INSTRUCTION
    assert "worth pursuing a grievance pathway" in str(config["system_instruction"])
    assert "untrusted case content" in str(config["system_instruction"])
    assert "Do not help fabricate" in str(config["system_instruction"])
    assert "official verification" in str(config["system_instruction"])
    assert "tools" not in config


def test_intake_live_config_keeps_draft_patch_tool() -> None:
    config = GeminiProvider().live_config("intake")

    assert "tools" in config


class ProviderException(Exception):
    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code


def test_classifies_common_gemini_provider_failures_without_raw_details() -> None:
    assert classify_provider_exception(ProviderException(429, "quota exceeded")) == (
        "rate_limited"
    )
    assert classify_provider_exception(ProviderException(403, "permission denied")) == (
        "not_authorized"
    )
    assert classify_provider_exception(ProviderException(404, "model not found")) == (
        "model_unavailable"
    )
    assert classify_provider_exception(ProviderException(503, "UNAVAILABLE")) == (
        "upstream_failure"
    )
    assert classify_provider_exception(ProviderException(503, "UNAVAILABLE")) == (
        "upstream_failure"
    )
    assert classify_provider_exception(TimeoutError("request timed out")) == "timeout"
    assert (
        classify_provider_exception(ProviderException(500, "upstream timed out"))
        == "timeout"
    )
    assert classify_provider_exception(ProviderException(504, "DEADLINE_EXCEEDED")) == (
        "timeout"
    )


def test_client_configures_bounded_retries_for_transient_gemini_failures(
    monkeypatch,
) -> None:
    from google import genai

    captured: dict[str, object] = {}

    def fake_client(**kwargs: object) -> object:
        captured.update(kwargs)
        return object()

    monkeypatch.setattr(genai, "Client", fake_client)

    provider = GeminiProvider(
        Settings(
            database_url="postgresql+psycopg://test",
            contact_hash_secret="test-secret",
            gemini_api_key="test-key",
            gemini_live_model="test-live-model",
            gemini_extraction_model="test-extraction-model",
            gemini_token_ttl_seconds=1800,
            gemini_session_ttl_seconds=60,
            gemini_max_transcript_chars=30000,
            gemini_request_timeout_ms=15000,
        )
    )

    provider._client()

    http_options = captured["http_options"]
    retry_options = http_options.retry_options
    assert http_options.timeout == 15000
    assert retry_options.attempts == 3
    assert retry_options.http_status_codes == [408, 429, 500, 502, 503, 504]
