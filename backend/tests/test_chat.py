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


def test_opening_turn_has_no_history(client, monkeypatch):
    parse_mock = mock_parse_returning("Hi! Who are the two parties to this NDA?", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = client.post(
        "/api/chat", json={"template": "mutual-nda", "messages": [], "fields": {}}
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Hi! Who are the two parties to this NDA?", "fields": {}}
    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("hasn't started yet" in message["content"] for message in sent_messages)


def test_turn_extracts_fields_from_user_message(client, monkeypatch):
    fields = {"party1Name": "Acme Inc.", "party2Name": "Globex Corp."}
    parse_mock = mock_parse_returning("Got it, and what's the purpose of sharing information?", fields)
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = client.post(
        "/api/chat",
        json={
            "template": "mutual-nda",
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


def test_known_fields_are_passed_to_the_model(client, monkeypatch):
    parse_mock = mock_parse_returning("Thanks - what's the effective date?", {"party1Name": "Acme Inc."})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    client.post(
        "/api/chat",
        json={"template": "mutual-nda", "messages": [], "fields": {"party1Name": "Acme Inc."}},
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("Party 1 name: Acme Inc." in message["content"] for message in sent_messages)


def test_openai_failure_returns_502(client, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    monkeypatch.setattr(chat_module.client.chat.completions, "parse", raise_error)

    response = client.post(
        "/api/chat", json={"template": "mutual-nda", "messages": [], "fields": {}}
    )

    assert response.status_code == 502


def test_unknown_template_returns_404(client):
    response = client.post(
        "/api/chat", json={"template": "not-a-real-template", "messages": [], "fields": {}}
    )

    assert response.status_code == 404


@pytest.mark.parametrize("template", ["csa", "dpa", "baa", "psa"])
def test_other_documents_use_their_own_field_schema(client, monkeypatch, template):
    """The chat route isn't NDA-specific: any registered document works the same way."""
    parse_mock = mock_parse_returning("Let's get started - who are the parties?", {})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = client.post(
        "/api/chat", json={"template": template, "messages": [], "fields": {}}
    )

    assert response.status_code == 200
    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "Mutual Non-Disclosure Agreement" not in system_prompt


def test_prompt_instructs_the_model_to_ask_a_follow_up_when_fields_are_missing(client, monkeypatch):
    parse_mock = mock_parse_returning("Thanks - and what's the effective date?", {"party1Name": "Acme Inc."})
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    client.post(
        "/api/chat", json={"template": "mutual-nda", "messages": [], "fields": {}}
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    system_prompt = sent_messages[0]["content"]
    assert "never end a turn without a next step" in system_prompt
