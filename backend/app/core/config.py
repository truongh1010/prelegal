from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/app/core -> backend/app -> backend -> repo root.
# Resolved explicitly so `.env` loads the same way whether run via `uv run` from
# backend/ (dev) or not at all (Docker, where secrets come from `docker run --env-file`
# and no .env is baked into the image).
_REPO_ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ROOT_ENV_FILE, extra="ignore")

    openai_api_key: str | None = None
    database_path: Path = Path("data/prelegal.db")
    static_dir: Path = Path("static")
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
