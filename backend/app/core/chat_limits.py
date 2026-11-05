from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel

from app.core.documents import DocumentSpec

# frontend/src/lib/chat/greetings.ts mirrors MAX_USER_MESSAGE_CHARS for its input's maxLength.
MAX_USER_MESSAGE_CHARS = 2000
# The client echoes assistant replies back in its history, so anything the server
# produces is clipped to this first (see clip) and can never be rejected later.
MAX_ASSISTANT_MESSAGE_CHARS = 4000
MAX_FIELD_VALUE_CHARS = 2000
# A request can hold one fewer than this, leaving room for the assistant's reply.
MAX_STORED_MESSAGES = 200
# Older turns are dropped from what the AI sees; saved fields keep that context.
OPENAI_CONTEXT_MESSAGES = 40
MAX_COMPLETION_TOKENS = 4000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


def _reject(detail: str) -> HTTPException:
    return HTTPException(status_code=422, detail=detail)


def validate_history(messages: list[ChatMessage]) -> None:
    """Runs before a message is charged, so a malformed request never costs one."""
    if not messages or messages[-1].role != "user" or not messages[-1].content.strip():
        raise _reject("Send a message to continue.")
    if len(messages) >= MAX_STORED_MESSAGES:
        raise _reject("This conversation is full. Please start a new document.")
    for message in messages:
        limit = MAX_USER_MESSAGE_CHARS if message.role == "user" else MAX_ASSISTANT_MESSAGE_CHARS
        if len(message.content) > limit:
            raise _reject(f"Messages can be at most {limit} characters long.")


def validate_fields(document: DocumentSpec, fields: dict[str, str | None]) -> dict[str, str | None]:
    """Client-supplied fields go into the prompt, so only the document's own fields
    are kept, each bounded in size."""
    allowed = {field.key for field in document.fields}
    known = {key: value for key, value in fields.items() if key in allowed}
    if any(value is not None and len(value) > MAX_FIELD_VALUE_CHARS for value in known.values()):
        raise _reject(f"Field values can be at most {MAX_FIELD_VALUE_CHARS} characters long.")
    return known


def clip(text: str, limit: int) -> str:
    return text[:limit]


def clip_fields(fields: dict[str, str | None]) -> dict[str, str | None]:
    return {
        key: clip(value, MAX_FIELD_VALUE_CHARS) if value is not None else None
        for key, value in fields.items()
    }
