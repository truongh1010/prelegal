from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# In-memory counters reset on restart, which is fine for one server process: these
# only slow down password guessing and signup farming.
limiter = Limiter(key_func=get_remote_address)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # slowapi's default body is {"error": ...}, but the frontend reads `detail`.
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many attempts. Please wait a bit and try again."},
        headers={"Retry-After": str(exc.limit.limit.get_expiry())},
    )
