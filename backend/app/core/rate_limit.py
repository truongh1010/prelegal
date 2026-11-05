from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from app.core.config import settings


def client_ip(request: Request) -> str:
    """Behind Fly's proxy every connection comes from the proxy itself, so the real
    address is in Fly-Client-IP. Without this, all users would share one bucket."""
    forwarded = request.headers.get("fly-client-ip") if settings.trust_fly_client_ip else None
    return forwarded or (request.client.host if request.client else "unknown")


# In-memory counters reset on restart, which is fine for one server process: these
# only slow down password guessing and signup farming. The durable limits on AI
# spending live in app/core/quota.py.
limiter = Limiter(key_func=client_ip)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # slowapi's default body is {"error": ...}, but the frontend reads `detail`.
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many attempts. Please wait a bit and try again."},
        headers={"Retry-After": str(exc.limit.limit.get_expiry())},
    )
