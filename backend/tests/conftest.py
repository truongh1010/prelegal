import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.main import app


@pytest.fixture(autouse=True)
def known_limits(monkeypatch):
    """Pins every limit so tests don't depend on what's in .env. The rate limits are
    set high because the limiter's counters live in memory, outliving the per-test
    database wipe, and every TestClient shares one address: otherwise the many signups
    across the suite would start failing with 429s partway through. Tests about a
    specific limit set their own value."""
    monkeypatch.setattr(settings, "ai_messages_per_account", 5)
    monkeypatch.setattr(settings, "ai_messages_per_day", 200)
    monkeypatch.setattr(settings, "signup_rate_limit", "10000/minute")
    monkeypatch.setattr(settings, "signin_rate_limit", "10000/minute")
    monkeypatch.setattr(settings, "trust_fly_client_ip", False)
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def client():
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def authed_client(client):
    """A TestClient that's already signed up/in as a throwaway user, for tests
    that exercise routes gated behind get_current_user (e.g. chat, discover)."""
    client.post("/api/signup", json={"email": "tester@example.com", "password": "password123"})
    return client


@pytest.fixture()
def document_id(authed_client):
    """A saved document belonging to authed_client's user, for tests that call
    /api/chat (which now requires an existing document to save turns into)."""
    response = authed_client.post("/api/documents", json={"template": "mutual-nda"})
    return response.json()["id"]
