import os
from dataclasses import dataclass

DEFAULT_DATABASE_URL = (
    "postgresql+psycopg://grahak:grahak_dev@localhost:5432/grahak_drishti"
)
DEFAULT_CONTACT_HASH_SECRET = "local-development-contact-hash-secret"
DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview"
DEFAULT_GEMINI_EXTRACTION_MODEL = "gemini-3.8-flash"
DEFAULT_GEMINI_TOKEN_TTL_SECONDS = 1800
DEFAULT_GEMINI_SESSION_TTL_SECONDS = 60
DEFAULT_GEMINI_MAX_TRANSCRIPT_CHARS = 30000
DEFAULT_GEMINI_REQUEST_TIMEOUT_MS = 15000


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str
    contact_hash_secret: str
    gemini_api_key: str | None
    gemini_live_model: str
    gemini_extraction_model: str
    gemini_token_ttl_seconds: int
    gemini_session_ttl_seconds: int
    gemini_max_transcript_chars: int
    gemini_request_timeout_ms: int


def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    return Settings(
        database_url=database_url,
        contact_hash_secret=os.getenv("CONTACT_HASH_SECRET")
        or DEFAULT_CONTACT_HASH_SECRET,
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_live_model=os.getenv("GEMINI_LIVE_MODEL")
        or DEFAULT_GEMINI_LIVE_MODEL,
        gemini_extraction_model=os.getenv("GEMINI_EXTRACTION_MODEL")
        or DEFAULT_GEMINI_EXTRACTION_MODEL,
        gemini_token_ttl_seconds=int(
            os.getenv("GEMINI_TOKEN_TTL_SECONDS", DEFAULT_GEMINI_TOKEN_TTL_SECONDS)
        ),
        gemini_session_ttl_seconds=int(
            os.getenv(
                "GEMINI_SESSION_TTL_SECONDS", DEFAULT_GEMINI_SESSION_TTL_SECONDS
            )
        ),
        gemini_max_transcript_chars=int(
            os.getenv(
                "GEMINI_MAX_TRANSCRIPT_CHARS", DEFAULT_GEMINI_MAX_TRANSCRIPT_CHARS
            )
        ),
        gemini_request_timeout_ms=int(
            os.getenv(
                "GEMINI_REQUEST_TIMEOUT_MS", DEFAULT_GEMINI_REQUEST_TIMEOUT_MS
            )
        ),
    )
