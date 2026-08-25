import os
from dataclasses import dataclass

DEFAULT_DATABASE_URL = (
    "postgresql+psycopg://grahak:grahak_dev@localhost:5432/grahak_drishti"
)


@dataclass(frozen=True, slots=True)
class Settings:
    database_url: str


def get_settings() -> Settings:
    return Settings(database_url=os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL)