import os
from dataclasses import dataclass

DEFAULT_DATABASE_URL = (
    "postgresql+psycopg://grahak:grahak_dev@localhost:5432/grahak_drishti"
)
DEFAULT_CONTACT_HASH_SECRET = "local-development-contact-hash-secret"


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str
    contact_hash_secret: str


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
    )
