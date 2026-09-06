from unittest.mock import MagicMock

import pytest
from openai import APIConnectionError

from app.api.routes import chat as chat_module


def mock_parse_returning(message: str, fields: dict[str, str | None]):
    parsed = MagicMock()
    parsed.message = message
    parsed.fields.model_dump.return_value = fields
    completion = MagicMock()
    completion.choices[0].message.parsed = parsed
    return MagicMock(return_value=completion)


def test_opening_turn_has_no_history(authed_client, document_id, monkeypatch):
    parse_mock = mock_parse_returning("Hi! Who are the two parties to this NDA?", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Hi! Who are the two parties to this NDA?", "fields": {}}
    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("hasn't started yet" in message["content"] for message in sent_messages)


def test_turn_extracts_fields_from_user_message(authed_client, document_id, monkeypatch):
    fields = {"party1Name": "Acme Inc.", "party2Name": "Globex Corp."}
    parse_mock = mock_parse_returning("Got it, and what's the purpose of sharing information?", fields)
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

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
    parse_mock = mock_parse_returning("Thanks - what's the effective date?", {"party1Name": "Acme Inc."})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    authed_client.post(
        "/api/chat",
        json={
            "template": "mutual-nda",
            "document_id": document_id,
            "messages": [],
            "fields": {"party1Name": "Acme Inc."},
        },
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("Party 1 name: Acme Inc." in message["content"] for message in sent_messages)


def test_openai_failure_returns_502(authed_client, document_id, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    monkeypatch.setattr(chat_module.client.chat.completions, "parse", raise_error)

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
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
    parse_mock = mock_parse_returning("Let's get started - who are the parties?", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = authed_client.post(
        "/api/chat",
        json={"template": template, "document_id": document_id, "messages": [], "fields": {}},
    )

    assert response.status_code == 200
    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "Mutual Non-Disclosure Agreement" not in system_prompt


def test_prompt_instructs_the_model_to_ask_a_follow_up_when_fields_are_missing(authed_client, document_id, monkeypatch):
    parse_mock = mock_parse_returning("Thanks - and what's the effective date?", {"party1Name": "Acme Inc."})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "never end a turn without a next step" in system_prompt


def test_chat_turn_is_auto_saved_to_the_document(authed_client, document_id, monkeypatch):
    parse_mock = mock_parse_returning("Got it, thanks!", {"party1Name": "Acme Inc.", "party2Name": None})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

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
    parse_mock = mock_parse_returning("Hi!", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)
    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": [], "fields": {}},
    )

    assert response.status_code == 404


def test_chat_with_unknown_document_id_returns_404(authed_client, monkeypatch):
    parse_mock = mock_parse_returning("Hi!", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": 999999, "messages": [], "fields": {}},
    )

    assert response.status_code == 404
