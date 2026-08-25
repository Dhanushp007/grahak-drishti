from sqlalchemy import text

from services.api.app.config import DEFAULT_DATABASE_URL, get_settings
from services.api.app.db import create_database_engine


def test_settings_use_the_local_postgres_default(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert get_settings().database_url == DEFAULT_DATABASE_URL


def test_database_engine_can_open_a_session() -> None:
    engine = create_database_engine("sqlite+pysqlite:///:memory:")

    with engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar_one() == 1

    engine.dispose()
