from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel, field_validator
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.core.auth import SESSION_COOKIE_NAME, SESSION_LIFETIME, get_current_user
from app.core.config import settings
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_session import UserSession

router = APIRouter()


def _email_taken() -> HTTPException:
    return HTTPException(status_code=409, detail="An account with that email already exists.")


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


def _set_session_cookie(response: Response, token: str) -> None:
    # Not `secure=True`: the app runs on plain http://localhost, where some browsers
    # would silently drop a Secure cookie, breaking auth entirely.
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=int(SESSION_LIFETIME.total_seconds()),
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
        raise _email_taken()

    user = User(email=credentials.email, hashed_password=hash_password(credentials.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # A simultaneous signup got there first, after the check above.
        db.rollback()
        raise _email_taken() from None
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
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut(email=user.email)
