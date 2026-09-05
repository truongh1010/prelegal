from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import chat, health
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# Mounted last so it never shadows the /api/* routes above. Only present once the
# frontend has been statically exported into this directory (e.g. by the Docker
# build) - local `uv run` dev without a build simply skips serving the SPA.
if settings.static_dir.is_dir():
    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="static")
