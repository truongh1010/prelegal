def test_create_document_returns_an_empty_document(authed_client):
    response = authed_client.post("/api/documents", json={"template": "mutual-nda"})

    assert response.status_code == 201
    body = response.json()
    assert body["template"] == "mutual-nda"
    assert body["template_name"] == "Mutual Non-Disclosure Agreement"
    assert body["fields"] == {}
    assert body["messages"] == []


def test_create_document_with_unknown_template_returns_404(authed_client):
    response = authed_client.post("/api/documents", json={"template": "not-a-real-template"})

    assert response.status_code == 404


def test_create_document_requires_a_session(client):
    response = client.post("/api/documents", json={"template": "mutual-nda"})

    assert response.status_code == 401


def test_list_documents_returns_only_the_caller_s_documents(authed_client):
    authed_client.post("/api/documents", json={"template": "mutual-nda"})
    authed_client.post("/api/documents", json={"template": "csa"})

    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})
    authed_client.post("/api/documents", json={"template": "dpa"})

    response = authed_client.get("/api/documents")

    assert response.status_code == 200
    templates = [doc["template"] for doc in response.json()]
    assert templates == ["dpa"]


def test_list_documents_orders_newest_updated_first(authed_client):
    from datetime import datetime, timedelta, timezone

    from sqlmodel import Session

    from app.core.database import engine
    from app.models.document import Document

    older = authed_client.post("/api/documents", json={"template": "mutual-nda"}).json()
    newer = authed_client.post("/api/documents", json={"template": "csa"}).json()

    # Force a deterministic ordering rather than relying on same-millisecond timing.
    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        session.get(Document, older["id"]).updated_at = now - timedelta(minutes=1)
        session.get(Document, newer["id"]).updated_at = now
        session.commit()

    response = authed_client.get("/api/documents")
    templates = [doc["template"] for doc in response.json()]
    assert templates == ["csa", "mutual-nda"]


def test_get_document_returns_full_detail(authed_client):
    created = authed_client.post("/api/documents", json={"template": "mutual-nda"}).json()

    response = authed_client.get(f"/api/documents/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["messages"] == []


def test_get_someone_elses_document_returns_404(authed_client):
    created = authed_client.post("/api/documents", json={"template": "mutual-nda"}).json()

    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})

    response = authed_client.get(f"/api/documents/{created['id']}")

    assert response.status_code == 404


def test_get_nonexistent_document_returns_404(authed_client):
    response = authed_client.get("/api/documents/999999")

    assert response.status_code == 404


def test_delete_document_removes_it(authed_client):
    created = authed_client.post("/api/documents", json={"template": "mutual-nda"}).json()

    delete_response = authed_client.delete(f"/api/documents/{created['id']}")
    assert delete_response.status_code == 204

    assert authed_client.get(f"/api/documents/{created['id']}").status_code == 404
    assert authed_client.get("/api/documents").json() == []


def test_delete_someone_elses_document_returns_404(authed_client):
    created = authed_client.post("/api/documents", json={"template": "mutual-nda"}).json()

    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})

    response = authed_client.delete(f"/api/documents/{created['id']}")

    assert response.status_code == 404


def test_documents_require_a_session(client):
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/documents/1").status_code == 401
    assert client.delete("/api/documents/1").status_code == 401
