from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.api.routes import auth as auth_routes
from app.core.database import engine
from app.models.user import User
from app.models.user_session import UserSession

from app.core.auth import SESSION_COOKIE_NAME


def test_signup_creates_a_session_cookie_and_returns_the_user(client):
    response = client.post("/api/signup", json={"email": "New@Example.com", "password": "password123"})

    assert response.status_code == 201
    assert response.json() == {"email": "new@example.com"}
    assert SESSION_COOKIE_NAME in response.cookies


def test_signup_rejects_a_duplicate_email(client):
    client.post("/api/signup", json={"email": "dup@example.com", "password": "password123"})
    response = client.post("/api/signup", json={"email": "dup@example.com", "password": "different123"})

    assert response.status_code == 409


def test_signup_rejects_a_short_password(client):
    response = client.post("/api/signup", json={"email": "short@example.com", "password": "short"})

    assert response.status_code == 422


def test_signin_with_correct_credentials_succeeds(client):
    client.post("/api/signup", json={"email": "signin@example.com", "password": "password123"})
    response = client.post("/api/signin", json={"email": "signin@example.com", "password": "password123"})

    assert response.status_code == 200
    assert response.json() == {"email": "signin@example.com"}


def test_signin_with_wrong_password_returns_401(client):
    client.post("/api/signup", json={"email": "wrongpw@example.com", "password": "password123"})
    response = client.post("/api/signin", json={"email": "wrongpw@example.com", "password": "not-it-123"})

    assert response.status_code == 401


def test_signin_with_unknown_email_returns_401(client):
    response = client.post("/api/signin", json={"email": "nobody@example.com", "password": "password123"})

    assert response.status_code == 401


def test_me_requires_a_session(client):
    response = client.get("/api/me")

    assert response.status_code == 401


def test_me_returns_the_signed_in_user(client):
    client.post("/api/signup", json={"email": "me@example.com", "password": "password123"})
    response = client.get("/api/me")

    assert response.status_code == 200
    assert response.json() == {"email": "me@example.com"}


def test_logout_clears_the_session(client):
    client.post("/api/signup", json={"email": "logout@example.com", "password": "password123"})
    assert client.get("/api/me").status_code == 200

    logout_response = client.post("/api/logout")
    assert logout_response.status_code == 204

    assert client.get("/api/me").status_code == 401


def test_chat_and_discover_require_a_session(client):
    assert client.post(
        "/api/chat", json={"template": "mutual-nda", "messages": [], "fields": {}}
    ).status_code == 401
    assert client.post("/api/discover", json={"messages": []}).status_code == 401


def age_sessions(age: timedelta) -> None:
    with Session(engine) as db:
        for session in db.exec(select(UserSession)).all():
            session.created_at = datetime.now(timezone.utc) - age
            db.add(session)
        db.commit()


def test_session_works_until_it_is_seven_days_old(client):
    client.post("/api/signup", json={"email": "old@example.com", "password": "password123"})
    age_sessions(timedelta(days=6, hours=23))

    assert client.get("/api/me").status_code == 200


def test_expired_session_is_rejected_and_removed(client):
    client.post("/api/signup", json={"email": "old@example.com", "password": "password123"})
    age_sessions(timedelta(days=7, minutes=1))

    assert client.get("/api/me").status_code == 401
    with Session(engine) as db:
        assert db.exec(select(UserSession)).all() == []


def test_cookie_lasts_as_long_as_the_session(client):
    response = client.post("/api/signup", json={"email": "cookie@example.com", "password": "password123"})

    assert f"Max-Age={60 * 60 * 24 * 7}" in response.headers["set-cookie"]


def test_simultaneous_signups_get_a_409_not_a_crash(client, monkeypatch):
    real_hash = auth_routes.hash_password

    def lose_the_race(password):
        # Runs between the route's duplicate check and its save, like a concurrent request.
        with Session(engine) as db:
            db.add(User(email="race@example.com", hashed_password="taken"))
            db.commit()
        return real_hash(password)

    monkeypatch.setattr(auth_routes, "hash_password", lose_the_race)

    response = client.post("/api/signup", json={"email": "race@example.com", "password": "password123"})

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with that email already exists."}
