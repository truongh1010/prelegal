from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """A registered account. Passwords are stored as bcrypt hashes."""

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Lifetime count, kept here rather than derived from stored chats so that
    # deleting a document can't give messages back.
    ai_messages_used: int = 0
