from datetime import datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    """A user's in-progress or completed document: the template it's for, the
    fields extracted so far, and the full chat history, so a chat can be
    resumed later. Stored as JSON since fields/messages are template-specific
    and shaped by whatever's registered in app.core.documents."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    template: str
    fields: dict[str, str | None] = Field(default_factory=dict, sa_column=Column(JSON))
    messages: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
