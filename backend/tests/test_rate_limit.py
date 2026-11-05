from app.core.config import settings

CREDENTIALS = {"email": "someone@example.com", "password": "password123"}


def attempt_signin(client, ip=None):
    headers = {"Fly-Client-IP": ip} if ip else {}
    return client.post("/api/signin", json=CREDENTIALS, headers=headers)


def test_signin_is_rate_limited_with_a_plain_string_error(client, monkeypatch):
    monkeypatch.setattr(settings, "signin_rate_limit", "2/minute")

    assert attempt_signin(client).status_code == 401
    assert attempt_signin(client).status_code == 401
    blocked = attempt_signin(client)

    assert blocked.status_code == 429
    assert blocked.json() == {"detail": "Too many attempts. Please wait a bit and try again."}
    assert int(blocked.headers["retry-after"]) > 0


def test_signup_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr(settings, "signup_rate_limit", "1/hour")

    first = client.post("/api/signup", json={"email": "a@example.com", "password": "password123"})
    second = client.post("/api/signup", json={"email": "b@example.com", "password": "password123"})

    assert first.status_code == 201
    assert second.status_code == 429


def test_each_client_ip_gets_its_own_bucket_behind_fly(client, monkeypatch):
    monkeypatch.setattr(settings, "signin_rate_limit", "1/minute")
    monkeypatch.setattr(settings, "trust_fly_client_ip", True)

    assert attempt_signin(client, ip="203.0.113.1").status_code == 401
    assert attempt_signin(client, ip="203.0.113.1").status_code == 429
    assert attempt_signin(client, ip="203.0.113.2").status_code == 401


def test_faked_ip_header_cannot_dodge_the_limit_outside_fly(client, monkeypatch):
    monkeypatch.setattr(settings, "signin_rate_limit", "1/minute")

    assert attempt_signin(client, ip="203.0.113.1").status_code == 401
    assert attempt_signin(client, ip="203.0.113.2").status_code == 429


def test_falls_back_to_the_connection_address_if_fly_sends_no_header(client, monkeypatch):
    monkeypatch.setattr(settings, "signin_rate_limit", "1/minute")
    monkeypatch.setattr(settings, "trust_fly_client_ip", True)

    assert attempt_signin(client).status_code == 401
    assert attempt_signin(client).status_code == 429
