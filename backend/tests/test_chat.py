from unittest.mock import MagicMock

import pytest
from openai import APIConnectionError

from tests.helpers import USER_TURN, fake_openai


def test_chat_turn_response_shape(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch, message="Thanks! What's the purpose?", fields={})

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": USER_TURN, "fields": {}},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Thanks! What's the purpose?", "fields": {}, "messages_remaining": 4}


def test_empty_conversation_never_reaches_the_ai(authed_client, document_id, monkeypatch):
    parse_mock = fake_openai(monkeypatch, message="Hi!", fields={})

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
    )

    assert response.status_code == 422
    parse_mock.assert_not_called()


def test_turn_extracts_fields_from_user_message(authed_client, document_id, monkeypatch):
    fields = {"party1Name": "Acme Inc.", "party2Name": "Globex Corp."}
    fake_openai(monkeypatch, message="Got it, and what's the purpose of sharing information?", fields=fields)

    response = authed_client.post(
        "/api/chat",
        json={
            "template": "mutual-nda",
            "document_id": document_id,
            "messages": [
                {"role": "assistant", "content": "Who are the parties?"},
                {"role": "user", "content": "Acme Inc. and Globex Corp."},
            ],
            "fields": {},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["party1Name"] == "Acme Inc."
    assert body["fields"]["party2Name"] == "Globex Corp."


def test_known_fields_are_passed_to_the_model(authed_client, document_id, monkeypatch):
    parse_mock = fake_openai(monkeypatch, message="Thanks - what's the effective date?", fields={"party1Name": "Acme Inc."})

    authed_client.post(
        "/api/chat",
        json={
            "template": "mutual-nda",
            "document_id": document_id,
            "messages": USER_TURN,
            "fields": {"party1Name": "Acme Inc."},
        },
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("Party 1 name: Acme Inc." in message["content"] for message in sent_messages)


def test_openai_failure_returns_502(authed_client, document_id, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    fake_openai(monkeypatch, parse=raise_error)

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": USER_TURN, "fields": {}},
    )

    assert response.status_code == 502


def test_unknown_template_returns_404(authed_client):
    # document_id is irrelevant here - the unknown-template check happens first.
    response = authed_client.post(
        "/api/chat",
        json={"template": "not-a-real-template", "document_id": 0, "messages": [], "fields": {}},
    )

    assert response.status_code == 404


@pytest.mark.parametrize("template", ["csa", "dpa", "baa", "psa"])
def test_other_documents_use_their_own_field_schema(authed_client, document_id, monkeypatch, template):
    """The chat route isn't NDA-specific: any registered document works the same way."""
    parse_mock = fake_openai(monkeypatch, message="Let's get started - who are the parties?", fields={})

    response = authed_client.post(
        "/api/chat",
        json={"template": template, "document_id": document_id, "messages": USER_TURN, "fields": {}},
    )

    assert response.status_code == 200
    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "Mutual Non-Disclosure Agreement" not in system_prompt


def test_prompt_instructs_the_model_to_ask_a_follow_up_when_fields_are_missing(authed_client, document_id, monkeypatch):
    parse_mock = fake_openai(monkeypatch, message="Thanks - and what's the effective date?", fields={"party1Name": "Acme Inc."})

    authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": USER_TURN, "fields": {}},
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "never end a turn without a next step" in system_prompt


def test_chat_turn_is_auto_saved_to_the_document(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch, message="Got it, thanks!", fields={"party1Name": "Acme Inc.", "party2Name": None})

    authed_client.post(
        "/api/chat",
        json={
            "template": "mutual-nda",
            "document_id": document_id,
            "messages": [{"role": "user", "content": "Acme Inc. is party 1."}],
            "fields": {},
        },
    )

    saved = authed_client.get(f"/api/documents/{document_id}").json()
    assert saved["fields"]["party1Name"] == "Acme Inc."
    assert saved["fields"].get("party2Name") is None
    assert saved["messages"] == [
        {"role": "user", "content": "Acme Inc. is party 1."},
        {"role": "assistant", "content": "Got it, thanks!"},
    ]


def test_chat_with_someone_elses_document_returns_404(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch, message="Hi!", fields={})
    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
    )

    assert response.status_code == 404


def test_chat_with_unknown_document_id_returns_404(authed_client, monkeypatch):
    fake_openai(monkeypatch, message="Hi!", fields={})

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": 999999, "messages": [], "fields": {}},
    )

    assert response.status_code == 404
