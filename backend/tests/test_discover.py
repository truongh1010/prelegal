from unittest.mock import MagicMock

from openai import APIConnectionError

from app.api.routes import discover as discover_module
from tests.helpers import USER_TURN, fake_openai


def test_discover_response_shape(authed_client, monkeypatch):
    fake_openai(monkeypatch, message="What kind of customer is it?", matched_slug=None)

    response = authed_client.post("/api/discover", json={"messages": USER_TURN})

    assert response.status_code == 200
    assert response.json() == {
        "message": "What kind of customer is it?",
        "matchedSlug": None,
        "messages_remaining": 4,
    }


def test_empty_conversation_never_reaches_the_ai(authed_client, monkeypatch):
    parse_mock = fake_openai(monkeypatch, message="Hi!", matched_slug=None)

    response = authed_client.post("/api/discover", json={"messages": []})

    assert response.status_code == 422
    parse_mock.assert_not_called()


def test_confirmed_match_returns_the_slug(authed_client, monkeypatch):
    fake_openai(monkeypatch, message="Let's set up a Cloud Service Agreement.", matched_slug="csa")

    response = authed_client.post(
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


def test_hallucinated_slug_is_normalized_to_none(authed_client, monkeypatch):
    """Defensive: an unsupported/hallucinated slug should never be forwarded to the frontend."""
    fake_openai(monkeypatch, message="Here's a match.", matched_slug="not-a-real-slug")

    response = authed_client.post("/api/discover", json={"messages": USER_TURN})

    assert response.status_code == 200
    assert response.json()["matchedSlug"] is None


def test_system_prompt_lists_every_discoverable_document():
    prompt = discover_module.build_system_prompt()
    for slug, name, _description in discover_module.discoverable_documents():
        assert slug in prompt
        assert name in prompt


def test_openai_failure_returns_502(authed_client, monkeypatch):
    def raise_error(*args, **kwargs):
        raise APIConnectionError(request=MagicMock())

    fake_openai(monkeypatch, parse=raise_error)

    response = authed_client.post("/api/discover", json={"messages": USER_TURN})

    assert response.status_code == 502
