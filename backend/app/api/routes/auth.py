from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel, field_validator
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.core import quota
from app.core.auth import SESSION_COOKIE_NAME, get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_session import UserSession

router = APIRouter()

# One week. Sessions are wiped early anyway whenever the container restarts,
# since the whole database is recreated from scratch on every boot.
COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


class Credentials(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or len(value) < 3:
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return value


class UserOut(BaseModel):
    email: str


class MeOut(UserOut):
    ai_messages_remaining: int
    ai_messages_limit: int


def _set_session_cookie(response: Response, token: str) -> None:
    # Not `secure=True`: the app is only ever served over plain HTTP today (no
    # TLS termination anywhere in this project's deployment), and a Secure
    # cookie would silently never be sent, breaking auth entirely.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE_SECONDS,
    )


@router.post("/signup", status_code=201)
@limiter.limit(lambda: settings.signup_rate_limit)
def signup(
    request: Request,
    credentials: Credentials,
    response: Response,
    db: DbSession = Depends(get_session),
) -> UserOut:
    existing = db.exec(select(User).where(User.email == credentials.email)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user = User(email=credentials.email, hashed_password=hash_password(credentials.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    session = UserSession(user_id=user.id)
    db.add(session)
    db.commit()

    _set_session_cookie(response, session.token)
    return UserOut(email=user.email)


@router.post("/signin")
@limiter.limit(lambda: settings.signin_rate_limit)
def signin(
    request: Request,
    credentials: Credentials,
    response: Response,
    db: DbSession = Depends(get_session),
) -> UserOut:
    user = db.exec(select(User).where(User.email == credentials.email)).first()
    if user is None or not verify_password(credentials.password, user.hashed_password):
        # Deliberately generic: doesn't reveal whether the email or the password was wrong.
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    session = UserSession(user_id=user.id)
    db.add(session)
    db.commit()

    _set_session_cookie(response, session.token)
    return UserOut(email=user.email)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    prelegal_session: str | None = Cookie(default=None),
    db: DbSession = Depends(get_session),
) -> None:
    if prelegal_session is not None:
        session = db.get(UserSession, prelegal_session)
        if session is not None:
            db.delete(session)
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)


@router.get("/me")
def me(user: User = Depends(get_current_user)) -> MeOut:
    return MeOut(
        email=user.email,
        ai_messages_remaining=quota.remaining(user),
        ai_messages_limit=settings.ai_messages_per_account,
    )
