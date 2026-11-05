import logging

from fastapi import HTTPException
from openai import OpenAI, OpenAIError

from app.core.config import settings

logger = logging.getLogger(__name__)

# No automatic retries: each one is another paid call, and a user can simply resend.
client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds, max_retries=0)


def ai_unavailable(error: OpenAIError) -> HTTPException:
    """Logs what failed, leaving out the error's text in case it echoes the user's chat."""
    logger.warning("OpenAI call failed: %s (status %s)", type(error).__name__, getattr(error, "status_code", None))
    return HTTPException(status_code=502, detail="The AI service is unavailable.")


def ai_unparseable() -> HTTPException:
    logger.warning("OpenAI reply could not be parsed")
    return HTTPException(status_code=502, detail="The AI response could not be parsed.")
