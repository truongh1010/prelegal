from unittest.mock import MagicMock

import pytest
from openai import APIConnectionError

from app.api.routes import chat as chat_module
from app.api.routes.chat import ChatTurnOutput, NdaFields


def mock_parse_returning(output: ChatTurnOutput):
    completion = MagicMock()
    completion.choices[0].message.parsed = output
    return MagicMock(return_value=completion)


def test_opening_turn_has_no_history(client, monkeypatch):
    output = ChatTurnOutput(message="Hi! Who are the two parties to this NDA?", fields=NdaFields())
    parse_mock = mock_parse_returning(output)
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    response = client.post("/api/chat", json={"messages": [], "fields": {}})

    assert response.status_code == 200
    assert response.json() == {"message": output.message, "fields": {k: None for k in NdaFields.model_fields}}
    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("hasn't started yet" in message["content"] for message in sent_messages)


def test_turn_extracts_fields_from_user_message(client, monkeypatch):
    output = ChatTurnOutput(
        message="Got it, and what's the purpose of sharing information?",
        fields=NdaFields(party1Name="Acme Inc.", party2Name="Globex Corp."),
    )
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", mock_parse_returning(output))

    response = client.post(
        "/api/chat",
        json={
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
    output = ChatTurnOutput(
        message="Thanks - what's the effective date?",
        fields=NdaFields(party1Name="Acme Inc."),
    )
    parse_mock = mock_parse_returning(output)
    monkeypatch.setattr(chat_module.client.chat.completions, "parse", parse_mock)

    client.post(
        "/api/chat",
        json={"messages": [], "fields": {"party1Name": "Acme Inc."}},
    )

    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("Party 1 name: Acme Inc." in message["content"] for message in sent_messages)


def test_openai_failure_returns_502(client, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    monkeypatch.setattr(chat_module.client.chat.completions, "parse", raise_error)

    response = client.post("/api/chat", json={"messages": [], "fields": {}})

    assert response.status_code == 502
