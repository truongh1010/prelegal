import importlib

from fastapi.testclient import TestClient

from app.core import config as config_module


def test_serves_static_frontend_export_when_present(tmp_path, monkeypatch):
    """When static_dir exists (e.g. the Next.js export copied in by the Docker
    build), "/" should serve it, and "/api/*" must still take priority over the
    "/" mount rather than being shadowed by it."""
    (tmp_path / "index.html").write_text("<html><body>Prelegal</body></html>")
    monkeypatch.setattr(config_module.settings, "static_dir", tmp_path)

    from app import main as main_module

    importlib.reload(main_module)

    with TestClient(main_module.app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "Prelegal" in response.text

        health_response = client.get("/api/health")
        assert health_response.status_code == 200
        assert health_response.json() == {"status": "ok"}
