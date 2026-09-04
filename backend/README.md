# backend

FastAPI backend, managed with [uv](https://docs.astral.sh/uv/). Serves the API under
`/api/*` and, once the frontend has been statically exported into `static/`, the app
itself at `/`.

## Local development

```bash
uv sync
uv run fastapi dev app/main.py   # http://localhost:8000, auto-reload
```

The database is SQLite (`data/prelegal.db`, relative to this directory) and is
recreated from scratch on every startup - nothing persists between runs.

## Tests

```bash
uv run pytest
```

## Running as part of the full app

See `../scripts/` for building and running the whole project (frontend + backend) as
a single Docker container.
