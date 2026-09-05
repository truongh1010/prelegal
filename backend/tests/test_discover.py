from unittest.mock import MagicMock

from openai import APIConnectionError

from app.api.routes import discover as discover_module


def mock_parse_returning(message: str, matched_slug: str | None):
    parsed = MagicMock()
    parsed.message = message
    parsed.matchedSlug = matched_slug
    completion = MagicMock()
    completion.choices[0].message.parsed = parsed
    return MagicMock(return_value=completion)


def test_opening_turn_has_no_history(client, monkeypatch):
    parse_mock = mock_parse_returning("Hi! What kind of document do you need?", None)
    monkeypatch.setattr(discover_module.client.chat.completions, "parse", parse_mock)

    response = client.post("/api/discover", json={"messages": []})

    assert response.status_code == 200
    assert response.json() == {"message": "Hi! What kind of document do you need?", "matchedSlug": None}
    sent_messages = parse_mock.call_args.kwargs["messages"]
    assert any("hasn't started yet" in message["content"] for message in sent_messages)


def test_confirmed_match_returns_the_slug(client, monkeypatch):
    parse_mock = mock_parse_returning("Let's set up a Cloud Service Agreement.", "csa")
    monkeypatch.setattr(discover_module.client.chat.completions, "parse", parse_mock)

    response = client.post(
        "/api/discover",
        json={
            "messages": [
                {"role": "assistant", "content": "What do you need?"},
                {"role": "user", "content": "I need to sell cloud software access to a customer"},
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["matchedSlug"] == "csa"


def test_hallucinated_slug_is_normalized_to_none(client, monkeypatch):
    """Defensive: an unsupported/hallucinated slug should never be forwarded to the frontend."""
    parse_mock = mock_parse_returning("Here's a match.", "not-a-real-slug")
    monkeypatch.setattr(discover_module.client.chat.completions, "parse", parse_mock)

    response = client.post("/api/discover", json={"messages": []})

    assert response.status_code == 200
    assert response.json()["matchedSlug"] is None


def test_system_prompt_lists_every_discoverable_document():
    prompt = discover_module.build_system_prompt()
    for slug, name, _description in discover_module.discoverable_documents():
        assert slug in prompt
        assert name in prompt


def test_openai_failure_returns_502(client, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    monkeypatch.setattr(discover_module.client.chat.completions, "parse", raise_error)

    response = client.post("/api/discover", json={"messages": []})

    assert response.status_code == 502
