# prelegal
A platform for drafting common legal agreements

**Status:** In progress — expected completion around 2026-08-29.

## Running locally

Requires [Docker](https://www.docker.com/products/docker-desktop/) with Compose, and a `.env` file in the project root containing `OPENAI_API_KEY=your-key`. Startup stops with an error if the key is missing.

The same commands work on Mac, Linux and Windows:

```bash
docker compose up --build -d --wait   # Start
docker compose down                   # Stop
docker compose logs app               # See why startup failed
```

The app is served at http://localhost:8000. The database is SQLite and is recreated from scratch whenever the container starts.
