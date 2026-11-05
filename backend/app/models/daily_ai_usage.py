from sqlmodel import Field, SQLModel


class DailyAiUsage(SQLModel, table=True):
    """How many AI messages the whole app has used on one UTC day. There's only
    ever one row per day, so this stays tiny."""

    day: str = Field(primary_key=True)  # ISO date, e.g. "2026-11-04"
    count: int = 0
