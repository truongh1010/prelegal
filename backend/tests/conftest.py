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


@pytest.fixture()
def document_id(authed_client):
    """A saved document belonging to authed_client's user, for tests that call
    /api/chat (which now requires an existing document to save turns into)."""
    response = authed_client.post("/api/documents", json={"template": "mutual-nda"})
    return response.json()["id"]
