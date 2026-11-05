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
    # Resolved relative to the backend process's cwd, same as static_dir/database_path
    # above: "../catalog.json" from backend/ locally (dev), and from /app in Docker,
    # where the Dockerfile places catalog.json one level above the app's WORKDIR to
    # match - see Dockerfile.
    catalog_path: Path = Path("../catalog.json")
    cors_origins: list[str] = ["http://localhost:3000"]
    ai_messages_per_account: int = 5
    ai_messages_per_day: int = 200
    openai_timeout_seconds: float = 45
    signup_rate_limit: str = "5/hour"
    signin_rate_limit: str = "10/minute"
    # Only turn this on behind Fly's proxy, which sets Fly-Client-IP itself. Anywhere
    # else a client could send the header and get a fresh rate-limit bucket every time.
    trust_fly_client_ip: bool = False


settings = Settings()
