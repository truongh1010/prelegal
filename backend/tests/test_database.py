from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.main import app
from app.models.user import User


def test_users_table_created_and_empty(client):
    assert settings.database_path.exists()
    with Session(engine) as session:
        assert session.exec(select(User)).all() == []


def test_users_table_accepts_a_row(client):
    with Session(engine) as session:
        session.add(User(email="test@example.com", hashed_password="not-a-real-hash"))
        session.commit()

        rows = session.exec(select(User)).all()
        assert len(rows) == 1
        assert rows[0].email == "test@example.com"


def test_database_is_wiped_on_a_second_boot(client):
    with Session(engine) as session:
        session.add(User(email="stale@example.com", hashed_password="whatever"))
        session.commit()
        assert session.exec(select(User)).all() != []

    # Simulates a container restart: a fresh TestClient re-triggers the lifespan's
    # init_db(), which must wipe out data left over from the previous boot.
    with TestClient(app):
        with Session(engine) as session:
            assert session.exec(select(User)).all() == []
