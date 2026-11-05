import logging
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.dialects.sqlite import insert
from sqlmodel import Session as DbSession

from app.core.config import settings
from app.core.database import engine
from app.models.daily_ai_usage import DailyAiUsage
from app.models.user import User

logger = logging.getLogger(__name__)


def utc_day() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _seconds_until_utc_midnight() -> int:
    now = datetime.now(timezone.utc)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now).total_seconds())


def remaining(user: User) -> int:
    return max(0, settings.ai_messages_per_account - user.ai_messages_used)


def reserve(db: DbSession, user_id: int) -> str:
    """Charges one AI message to both counters and returns the day it was charged
    to, or raises a 429.

    Each counter moves through a single conditional UPDATE, so concurrent requests
    can't both slip past a limit the way a read-then-write check would. Committing
    here, before the slow OpenAI call, means no SQLite write lock is held during it.
    The account check runs first so someone who's out of messages always gets the
    account message and never touches the shared daily row.
    """
    charged_account = db.exec(
        update(User)
        .where(User.id == user_id, User.ai_messages_used < settings.ai_messages_per_account)
        .values(ai_messages_used=User.ai_messages_used + 1)
    )
    if charged_account.rowcount == 0:
        db.rollback()
        limit = settings.ai_messages_per_account
        raise HTTPException(
            status_code=429,
            detail=(
                f"You've used all {limit} of your free AI messages. "
                "You can still open and download your saved documents."
            ),
        )

    day = utc_day()
    db.exec(insert(DailyAiUsage).values(day=day, count=0).on_conflict_do_nothing())
    charged_day = db.exec(
        update(DailyAiUsage)
        .where(DailyAiUsage.day == day, DailyAiUsage.count < settings.ai_messages_per_day)
        .values(count=DailyAiUsage.count + 1)
    )
    if charged_day.rowcount == 0:
        db.rollback()  # also undoes the account charge above
        raise HTTPException(
            status_code=429,
            detail="Prelegal has reached its AI limit for today. Please try again tomorrow.",
            headers={"Retry-After": str(_seconds_until_utc_midnight())},
        )

    db.commit()
    return day


def refund(user_id: int, day: str) -> None:
    """Gives back a reserved message. Uses its own session so it works whatever state
    the request's session was left in, and takes the reserved day rather than today so
    a call that crosses midnight refunds the right row. Logs rather than raises, so a
    failed refund can't hide the error that caused it."""
    try:
        with DbSession(engine) as db:
            db.exec(
                update(User)
                .where(User.id == user_id, User.ai_messages_used > 0)
                .values(ai_messages_used=User.ai_messages_used - 1)
            )
            db.exec(
                update(DailyAiUsage)
                .where(DailyAiUsage.day == day, DailyAiUsage.count > 0)
                .values(count=DailyAiUsage.count - 1)
            )
            db.commit()
    except Exception:
        logger.exception("Failed to refund an AI message for user %s", user_id)


@contextmanager
def charged_ai_message(db: DbSession, user_id: int) -> Iterator[None]:
    """Reserves a message for the block, and refunds it exactly once if the block fails."""
    day = reserve(db, user_id)
    try:
        yield
    except Exception:
        db.rollback()
        refund(user_id, day)
        raise
