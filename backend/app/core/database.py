from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

engine = create_engine(f"sqlite:///{settings.database_path}", connect_args={"check_same_thread": False})


def init_db() -> None:
    """Recreate the database from scratch. Called once on app startup so every
    container boot starts with a clean, empty schema (no persistence between runs).

    Drops/recreates tables on the existing engine rather than deleting the db file,
    since the engine's pooled connections would otherwise outlive the deleted file."""
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)

    from app.models.daily_ai_usage import DailyAiUsage  # noqa: F401  (same, for the app-wide AI limit)
    from app.models.document import Document  # noqa: F401  (same, for saved documents)
    from app.models.user import User  # noqa: F401  (registers the table with SQLModel.metadata)
    from app.models.user_session import UserSession  # noqa: F401  (same, for sessions)

    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
