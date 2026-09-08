from services.ai.app.gemini_provider import classify_provider_exception


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
    assert classify_provider_exception(TimeoutError("request timed out")) == "timeout"
    assert (
        classify_provider_exception(ProviderException(500, "upstream timed out"))
        == "timeout"
    )
    assert classify_provider_exception(ProviderException(504, "DEADLINE_EXCEEDED")) == (
        "timeout"
    )