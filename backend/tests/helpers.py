from unittest.mock import MagicMock

from app.core.openai_client import client

USER_TURN = [{"role": "user", "content": "Acme Inc. and Globex Corp."}]


def fake_openai(monkeypatch, message="Thanks!", fields=None, matched_slug=None, parse=None):
    """Stands in for the OpenAI call, returning the given reply, or running `parse`
    instead when a test needs it to fail. Returns the mock so calls can be inspected."""
    if parse is None:
        parsed = MagicMock()
        parsed.message = message
        parsed.matchedSlug = matched_slug
        parsed.fields.model_dump.return_value = fields or {}
        completion = MagicMock()
        completion.choices[0].message.parsed = parsed
        parse = MagicMock(return_value=completion)
    monkeypatch.setattr(client.chat.completions, "parse", parse)
    return parse
