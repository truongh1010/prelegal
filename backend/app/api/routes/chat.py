from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAIError
from pydantic import BaseModel, create_model

from app.core.auth import get_current_user
from app.core.documents import (
    DocumentSpec,
    build_field_labels,
    build_fields_model,
    build_system_prompt,
    get_document,
)
from app.core.openai_client import client
from app.models.user import User

router = APIRouter()

MODEL = "gpt-5-nano"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    template: str
    messages: list[ChatMessage] = []
    fields: dict[str, str | None] = {}


class ChatTurnResponse(BaseModel):
    message: str
    fields: dict[str, str | None]


def known_fields_summary(document: DocumentSpec, fields: dict[str, str | None]) -> str:
    labels = build_field_labels(document)
    known = {key: value for key, value in fields.items() if value}
    if not known:
        return "No fields are known yet."
    return "Fields already known:\n" + "\n".join(
        f"- {labels.get(key, key)}: {value}" for key, value in known.items()
    )


def generate_chat_turn(
    document: DocumentSpec, messages: list[ChatMessage], fields: dict[str, str | None]
) -> ChatTurnResponse:
    fields_model = build_fields_model(document)
    model_name = document.slug.title().replace("-", "")
    turn_output_model = create_model(
        f"{model_name}ChatTurnOutput",
        message=(str, ...),
        fields=(fields_model, ...),
    )

    openai_messages = [
        {"role": "system", "content": build_system_prompt(document)},
        {"role": "system", "content": known_fields_summary(document, fields)},
        *[{"role": message.role, "content": message.content} for message in messages],
    ]
    if not messages:
        openai_messages.append(
            {
                "role": "system",
                "content": "The conversation hasn't started yet. Greet the user and ask your first question.",
            }
        )

    completion = client.chat.completions.parse(
        model=MODEL,
        messages=openai_messages,
        response_format=turn_output_model,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="The AI response could not be parsed.")
    return ChatTurnResponse(message=parsed.message, fields=parsed.fields.model_dump())


@router.post("/chat")
def chat(request: ChatRequest, user: User = Depends(get_current_user)) -> ChatTurnResponse:
    document = get_document(request.template)
    if document is None:
        raise HTTPException(status_code=404, detail=f'Unknown template "{request.template}".')
    try:
        return generate_chat_turn(document, request.messages, request.fields)
    except OpenAIError as error:
        raise HTTPException(status_code=502, detail="The AI service is unavailable.") from error
