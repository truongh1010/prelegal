import pytest
from fastapi.testclient import TestClient

from app.main import app


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
