# --- Stage 1: build the Next.js static export -------------------------------
# frontend/src/lib/templates/catalog.ts reads catalog.json and templates/ one
# directory above the frontend app's cwd, so this stage preserves that layout
# (repo-root files copied alongside frontend/, not flattened).
FROM node:22-slim AS frontend-builder
WORKDIR /repo
COPY catalog.json ./catalog.json
COPY templates ./templates
COPY frontend ./frontend
WORKDIR /repo/frontend
RUN npm ci
RUN npm run build

# --- Stage 2: FastAPI backend, serving the API + the static export ----------
FROM python:3.12-slim AS backend
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/app ./app
RUN uv sync --frozen --no-dev

COPY --from=frontend-builder /repo/frontend/out ./static

# backend/app/core/config.py's catalog_path default ("../catalog.json") is resolved
# relative to the backend process's cwd (WORKDIR /app below), so this is placed one
# level above it to match - the same relationship catalog.json has to backend/ locally.
COPY catalog.json /catalog.json

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
