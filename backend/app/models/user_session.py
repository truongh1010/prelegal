import secrets
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def generate_token() -> str:
    return secrets.token_urlsafe(32)


class UserSession(SQLModel, table=True):
    """An active signed-in session, keyed by the opaque token stored in the
    httpOnly session cookie. Named UserSession (not Session) to avoid colliding
    with sqlmodel's own Session (a DB session) used throughout the app."""

    token: str = Field(default_factory=generate_token, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
