from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from openai import APIConnectionError
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, select

from app.core import quota
from app.core.config import settings
from app.core.database import engine
from app.models.daily_ai_usage import DailyAiUsage
from app.models.user import User
from tests.helpers import USER_TURN, fake_openai


def send_chat(client, document_id):
    return client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": USER_TURN, "fields": {}},
    )


def send_discover(client):
    return client.post("/api/discover", json={"messages": USER_TURN})


def account_used(email="tester@example.com") -> int:
    with Session(engine) as db:
        return db.exec(select(User).where(User.email == email)).one().ai_messages_used


def day_used(day: str | None = None) -> int:
    with Session(engine) as db:
        row = db.get(DailyAiUsage, day or quota.utc_day())
        return row.count if row else 0


def raise_connection_error(*args, **kwargs):
    raise APIConnectionError(request=MagicMock())


def test_account_is_limited_to_five_messages_for_life(authed_client, document_id, monkeypatch):
    parse = fake_openai(monkeypatch)

    remaining = [send_chat(authed_client, document_id).json()["messages_remaining"] for _ in range(5)]
    blocked = send_chat(authed_client, document_id)

    assert remaining == [4, 3, 2, 1, 0]
    assert blocked.status_code == 429
    assert "used all 5" in blocked.json()["detail"]
    assert parse.call_count == 5
    assert account_used() == 5


def test_chat_and_discover_share_the_same_allowance(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)

    for _ in range(3):
        assert send_discover(authed_client).status_code == 200
    for _ in range(2):
        assert send_chat(authed_client, document_id).status_code == 200

    assert send_discover(authed_client).status_code == 429
    assert send_chat(authed_client, document_id).status_code == 429


def test_me_reports_what_is_left(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    send_chat(authed_client, document_id)

    body = authed_client.get("/api/me").json()

    assert body["ai_messages_remaining"] == 4
    assert body["ai_messages_limit"] == 5


def test_deleting_a_document_does_not_give_messages_back(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    send_chat(authed_client, document_id)

    authed_client.delete(f"/api/documents/{document_id}")

    assert authed_client.get("/api/me").json()["ai_messages_remaining"] == 4


def test_signing_out_and_back_in_does_not_reset_the_allowance(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    send_chat(authed_client, document_id)

    authed_client.post("/api/logout")
    authed_client.post("/api/signin", json={"email": "tester@example.com", "password": "password123"})

    assert authed_client.get("/api/me").json()["ai_messages_remaining"] == 4


def test_saved_documents_stay_available_at_the_limit(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    monkeypatch.setattr(settings, "ai_messages_per_account", 1)
    send_chat(authed_client, document_id)
    assert send_chat(authed_client, document_id).status_code == 429

    assert authed_client.get("/api/documents").status_code == 200
    saved = authed_client.get(f"/api/documents/{document_id}")
    assert saved.status_code == 200
    assert len(saved.json()["messages"]) == 2


def test_app_wide_daily_limit_blocks_everyone_with_its_own_message(client, monkeypatch):
    fake_openai(monkeypatch)
    monkeypatch.setattr(settings, "ai_messages_per_day", 2)
    client.post("/api/signup", json={"email": "first@example.com", "password": "password123"})
    assert send_discover(client).status_code == 200
    assert send_discover(client).status_code == 200

    client.post("/api/logout")
    client.post("/api/signup", json={"email": "second@example.com", "password": "password123"})
    blocked = send_discover(client)

    assert blocked.status_code == 429
    assert "for today" in blocked.json()["detail"]
    assert 0 < int(blocked.headers["retry-after"]) <= 86400
    # The rollback must leave this user uncharged, or the daily limit eats lifetime messages.
    assert account_used("second@example.com") == 0
    assert day_used() == 2


def test_new_day_gets_a_fresh_daily_count(authed_client, monkeypatch):
    fake_openai(monkeypatch)
    monkeypatch.setattr(settings, "ai_messages_per_day", 1)
    monkeypatch.setattr(quota, "utc_day", lambda: "2026-01-01")
    assert send_discover(authed_client).status_code == 200
    assert send_discover(authed_client).status_code == 429

    monkeypatch.setattr(quota, "utc_day", lambda: "2026-01-02")

    assert send_discover(authed_client).status_code == 200


def test_failed_ai_call_is_refunded_on_both_counters(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch, parse=raise_connection_error)

    assert send_chat(authed_client, document_id).status_code == 502
    assert send_discover(authed_client).status_code == 502

    assert account_used() == 0
    assert day_used() == 0


def test_unparseable_ai_reply_is_refunded(authed_client, document_id, monkeypatch):
    completion = MagicMock()
    completion.choices[0].message.parsed = None
    fake_openai(monkeypatch, parse=MagicMock(return_value=completion))

    assert send_chat(authed_client, document_id).status_code == 502
    assert account_used() == 0


def test_reply_that_cannot_be_saved_is_refunded(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    client = authed_client
    original_commit = Session.commit
    calls = {"count": 0}

    def failing_second_commit(self):
        # The first commit in the route is the reservation; the second saves the document.
        calls["count"] += 1
        if calls["count"] == 2:
            raise OperationalError("save", {}, Exception("disk full"))
        original_commit(self)

    monkeypatch.setattr(Session, "commit", failing_second_commit)
    with pytest.raises(OperationalError):
        send_chat(client, document_id)
    monkeypatch.setattr(Session, "commit", original_commit)

    assert account_used() == 0


def test_refund_goes_to_the_day_it_was_charged_to(authed_client, monkeypatch):
    def fail_after_midnight(*args, **kwargs):
        monkeypatch.setattr(quota, "utc_day", lambda: "2026-01-02")
        raise_connection_error()

    fake_openai(monkeypatch, parse=fail_after_midnight)
    monkeypatch.setattr(quota, "utc_day", lambda: "2026-01-01")

    send_discover(authed_client)

    assert day_used("2026-01-01") == 0
    assert day_used("2026-01-02") == 0


def test_refund_never_takes_a_counter_below_zero(authed_client):
    with Session(engine) as db:
        user = db.exec(select(User).where(User.email == "tester@example.com")).one()
        user_id = user.id

    quota.refund(user_id, quota.utc_day())

    assert account_used() == 0


@pytest.mark.parametrize(
    "messages",
    [
        [],
        [{"role": "assistant", "content": "Hello"}],
        [{"role": "user", "content": "   "}],
        [{"role": "user", "content": "x" * 2001}],
    ],
)
def test_invalid_requests_cost_nothing(authed_client, document_id, monkeypatch, messages):
    parse = fake_openai(monkeypatch)

    response = authed_client.post(
        "/api/chat",
        json={"template": "mutual-nda", "document_id": document_id, "messages": messages, "fields": {}},
    )

    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    parse.assert_not_called()
    assert account_used() == 0


def test_other_users_document_costs_nothing(authed_client, document_id, monkeypatch):
    fake_openai(monkeypatch)
    authed_client.post("/api/logout")
    authed_client.post("/api/signup", json={"email": "other@example.com", "password": "password123"})

    assert send_chat(authed_client, document_id).status_code == 404
    assert account_used("other@example.com") == 0


def test_concurrent_reservations_cannot_overshoot_the_account_limit(authed_client):
    with Session(engine) as db:
        user_id = db.exec(select(User).where(User.email == "tester@example.com")).one().id

    def attempt(_):
        with Session(engine) as db:
            try:
                quota.reserve(db, user_id)
                return True
            except HTTPException:
                return False

    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(attempt, range(24)))

    assert results.count(True) == 5
    assert account_used() == 5
    assert day_used() == 5


def test_concurrent_reservations_cannot_overshoot_the_daily_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_messages_per_day", 3)
    user_ids = []
    for index in range(10):
        client.post("/api/signup", json={"email": f"user{index}@example.com", "password": "password123"})
        with Session(engine) as db:
            user_ids.append(db.exec(select(User).where(User.email == f"user{index}@example.com")).one().id)

    def attempt(user_id):
        with Session(engine) as db:
            try:
                quota.reserve(db, user_id)
                return True
            except HTTPException:
                return False

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(attempt, user_ids))

    assert results.count(True) == 3
    assert day_used() == 3
    assert sum(account_used(f"user{index}@example.com") for index in range(10)) == 3
