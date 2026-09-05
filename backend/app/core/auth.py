from fastapi import Cookie, Depends, HTTPException
from sqlmodel import Session as DbSession

from app.core.database import get_session
from app.models.user import User
from app.models.user_session import UserSession

SESSION_COOKIE_NAME = "prelegal_session"


def get_current_user(
    prelegal_session: str | None = Cookie(default=None),
    db: DbSession = Depends(get_session),
) -> User:
    if prelegal_session is None:
        raise HTTPException(status_code=401, detail="Not signed in.")

    user_session = db.get(UserSession, prelegal_session)
    if user_session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")

    user = db.get(User, user_session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")

    return user
