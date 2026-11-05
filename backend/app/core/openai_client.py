from openai import OpenAI

from app.core.config import settings

# No automatic retries: each one is another paid call, and a user can simply resend.
client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds, max_retries=0)
