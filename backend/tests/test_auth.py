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
