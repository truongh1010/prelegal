from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAIError
from pydantic import BaseModel
from sqlmodel import Session as DbSession

from app.core import quota
from app.core.auth import get_current_user
from app.core.catalog import read_catalog
from app.core.chat_limits import (
    MAX_ASSISTANT_MESSAGE_CHARS,
    ChatMessage,
    MAX_COMPLETION_TOKENS,
    OPENAI_CONTEXT_MESSAGES,
    clip,
    validate_history,
)
from app.core.database import get_session
from app.core.documents import DOCUMENTS
from app.core.openai_client import client
from app.models.user import User

router = APIRouter()

MODEL = "gpt-5-nano"


class DiscoverRequest(BaseModel):
    messages: list[ChatMessage]


class DiscoverTurnOutput(BaseModel):
    message: str
    matchedSlug: str | None = None


# Separate from DiscoverTurnOutput, which is the schema the AI fills in.
class DiscoverResponse(DiscoverTurnOutput):
    messages_remaining: int


def discoverable_documents() -> list[tuple[str, str, str]]:
    """Returns (slug, name, description) for every catalog entry with a creator registered."""
    by_filename = {document.filename: document for document in DOCUMENTS}
    result = []
    for entry in read_catalog():
        document = by_filename.get(entry.filename)
        if document is not None:
            result.append((document.slug, entry.name, entry.description))
    return result


def build_system_prompt() -> str:
    documents = discoverable_documents()
    listing = "\n".join(
        f'- {slug}: "{name}" - {description}' for slug, name, description in documents
    )
    return f"""You are a friendly assistant helping someone figure out which legal document \
they need. Here are the documents you can generate (slug: "Name" - description):

{listing}

The user has already seen a greeting, so don't greet them again. They only get a few AI \
messages in total, shared with drafting the document itself, so settle this in as few turns as \
possible. If what they want is reasonably clear, match it right away rather than asking \
follow-up questions. Match their description to the single best document from the list above.

If their request clearly matches one of the documents (even if worded informally), set \
matchedSlug to that document's slug and let them know which document you'll help them create.

If their request does not match any document in the list (for example, a document type we \
don't support at all), do not set matchedSlug. Instead, kindly explain that you can't \
generate that specific document, and suggest the closest document from the list above as an \
alternative. Only set matchedSlug once the user has agreed to proceed with a specific \
document - either one that directly matched, or an alternative they've confirmed they want.

Keep your messages short and conversational, not legalistic."""


def generate_discover_turn(messages: list[ChatMessage]) -> DiscoverTurnOutput:
    openai_messages = [
        {"role": "system", "content": build_system_prompt()},
        *[
            {"role": message.role, "content": message.content}
            for message in messages[-OPENAI_CONTEXT_MESSAGES:]
        ],
    ]

    completion = client.chat.completions.parse(
        model=MODEL,
        messages=openai_messages,
        response_format=DiscoverTurnOutput,
        max_completion_tokens=MAX_COMPLETION_TOKENS,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="The AI response could not be parsed.")

    valid_slugs = {slug for slug, _, _ in discoverable_documents()}
    if parsed.matchedSlug not in valid_slugs:
        parsed.matchedSlug = None
    return parsed


@router.post("/discover")
def discover(
    request: DiscoverRequest,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_session),
) -> DiscoverResponse:
    validate_history(request.messages)

    with quota.charged_ai_message(db, user.id):
        try:
            result = generate_discover_turn(request.messages)
        except OpenAIError as error:
            raise HTTPException(status_code=502, detail="The AI service is unavailable.") from error

    return DiscoverResponse(
        message=clip(result.message, MAX_ASSISTANT_MESSAGE_CHARS),
        matchedSlug=result.matchedSlug,
        messages_remaining=quota.remaining(user),
    )
