from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from services.ai.app.gemini_provider import (
    GeminiInvalidOutputError,
    GeminiNotConfiguredError,
    GeminiProvider,
    GeminiProviderError,
    get_gemini_provider,
)
from services.api.app.intake_schemas import (
    IntakeNormalizeRequest,
    IntakeNormalizeResponse,
    LiveTokenResponse,
)

router = APIRouter(prefix="/api/v1/intake", tags=["intake"])


def provider_dependency() -> GeminiProvider:
    return get_gemini_provider()


def _provider_error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@router.post("/live-token", response_model=LiveTokenResponse)
def issue_live_token(
    provider: Annotated[GeminiProvider, Depends(provider_dependency)],
) -> LiveTokenResponse | JSONResponse:
    try:
        token = provider.create_live_token()
    except GeminiNotConfiguredError:
        return _provider_error_response(
            "AI_PROVIDER_NOT_CONFIGURED",
            "Voice assistance is not configured for this environment.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except GeminiProviderError:
        return _provider_error_response(
            "AI_PROVIDER_UNAVAILABLE",
            "Voice assistance is temporarily unavailable.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return LiveTokenResponse(
        token=token.token,
        model=token.model,
        expires_at=token.expires_at,
        new_session_expires_at=token.new_session_expires_at,
    )


@router.post("/normalize", response_model=IntakeNormalizeResponse)
def normalize_intake(
    payload: IntakeNormalizeRequest,
    provider: Annotated[GeminiProvider, Depends(provider_dependency)],
) -> IntakeNormalizeResponse | JSONResponse:
    try:
        normalized = provider.normalize(payload)
    except GeminiNotConfiguredError:
        response = IntakeNormalizeResponse(
            status="provider_unavailable",
            draft=payload.draft,
            missing_required=payload.draft.missing_required_fields(),
            provider_error="not_configured",
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump(mode="json"),
        )
    except GeminiInvalidOutputError:
        response = IntakeNormalizeResponse(
            status="invalid_provider_output",
            draft=payload.draft,
            missing_required=payload.draft.missing_required_fields(),
            provider_error="invalid_output",
        )
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=response.model_dump(mode="json"),
        )
    except GeminiProviderError as exc:
        response = IntakeNormalizeResponse(
            status="provider_unavailable",
            draft=payload.draft,
            missing_required=payload.draft.missing_required_fields(),
            provider_error=exc.reason,
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response.model_dump(mode="json"),
        )

    draft = normalized.draft
    return IntakeNormalizeResponse(
        status="needs_review"
        if draft.missing_required_fields()
        or any(item.needs_review for item in draft.provenance.values())
        else "ok",
        draft=draft,
        missing_required=draft.missing_required_fields(),
        model=normalized.model,
    )