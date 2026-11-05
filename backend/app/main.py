import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.api.routes import auth, chat, discover, documents, health
from app.core.config import settings
from app.core.database import init_db
from app.core.rate_limit import limiter, rate_limit_handler


# Uvicorn only sets up its own loggers, so the app's need configuring here.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(discover.router, prefix="/api")
app.include_router(documents.router, prefix="/api")

# Mounted last so it never shadows the /api/* routes above. Only present once the
# frontend has been statically exported into this directory (e.g. by the Docker
# build) - local `uv run` dev without a build simply skips serving the SPA.
if settings.static_dir.is_dir():
    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="static")
