from typing import Literal

from fastapi import APIRouter, HTTPException
from openai import OpenAIError
from pydantic import BaseModel

from app.core.openai_client import client

router = APIRouter()

MODEL = "gpt-5-nano"

# Field names are camelCase (rather than the usual Python snake_case) so they match
# the frontend's TemplateValues keys (frontend/src/lib/templates/registry.ts)
# verbatim - this is the wire contract between the two, not a Python style choice.
class NdaFields(BaseModel):
    party1Name: str | None = None
    party1Address: str | None = None
    party2Name: str | None = None
    party2Address: str | None = None
    effectiveDate: str | None = None
    purpose: str | None = None
    mndaTerm: str | None = None
    confidentialityTerm: str | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None


class ChatTurnOutput(BaseModel):
    message: str
    fields: NdaFields


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = []
    fields: NdaFields = NdaFields()


SYSTEM_PROMPT = """You are a friendly assistant helping someone fill in a Mutual \
Non-Disclosure Agreement (Mutual NDA). Your job is to have a natural, conversational \
back-and-forth that gathers the following fields. Ask about one or two related fields \
at a time - never recite the whole list as a form.

Fields to gather:
- party1Name: legal name of the first party (company or individual).
- party1Address: mailing address of the first party.
- party2Name: legal name of the second party.
- party2Address: mailing address of the second party.
- effectiveDate: the date the agreement starts, as an ISO date (YYYY-MM-DD).
- purpose: why the parties are sharing confidential information (e.g. "evaluating a \
potential partnership").
- mndaTerm: how long the agreement itself lasts (e.g. "2 years").
- confidentialityTerm: how long confidentiality obligations survive after the \
agreement ends (e.g. "5 years").
- governingLaw: the US state whose law governs the agreement (e.g. "Delaware").
- jurisdiction: the court venue for disputes (e.g. "Santa Clara County, California").

You will be told which fields are already known. Treat those as confirmed: repeat \
them back unchanged in your output unless the user explicitly gives a new value for \
that same field. Only fill in fields the user has actually provided information for -\
 leave everything else null rather than guessing.

Once every field is known, tell the user their document is ready to review and stop \
asking questions (you may still answer follow-up questions or accept corrections).

Never mention the internal field names (e.g. "mndaTerm", "party1Name") in your \
message to the user - always describe them in plain English (e.g. "how long the \
agreement lasts", "the first party's name").

Keep your messages short and conversational, not legalistic."""

# Human-readable labels for the known-fields summary below, so the model never sees
# (and can't accidentally echo back) the internal camelCase field names.
FIELD_LABELS = {
    "party1Name": "Party 1 name",
    "party1Address": "Party 1 address",
    "party2Name": "Party 2 name",
    "party2Address": "Party 2 address",
    "effectiveDate": "Effective date",
    "purpose": "Purpose",
    "mndaTerm": "MNDA term",
    "confidentialityTerm": "Confidentiality term",
    "governingLaw": "Governing law",
    "jurisdiction": "Jurisdiction",
}


def known_fields_summary(fields: NdaFields) -> str:
    known = {key: value for key, value in fields.model_dump().items() if value}
    if not known:
        return "No fields are known yet."
    return "Fields already known:\n" + "\n".join(
        f"- {FIELD_LABELS.get(key, key)}: {value}" for key, value in known.items()
    )


def generate_chat_turn(messages: list[ChatMessage], fields: NdaFields) -> ChatTurnOutput:
    openai_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": known_fields_summary(fields)},
        *[{"role": message.role, "content": message.content} for message in messages],
    ]
    if not messages:
        openai_messages.append(
            {"role": "system", "content": "The conversation hasn't started yet. Greet the user and ask your first question."}
        )

    completion = client.chat.completions.parse(
        model=MODEL,
        messages=openai_messages,
        response_format=ChatTurnOutput,
    )
    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise HTTPException(status_code=502, detail="The AI response could not be parsed.")
    return parsed


@router.post("/chat")
def chat(request: ChatRequest) -> ChatTurnOutput:
    try:
        return generate_chat_turn(request.messages, request.fields)
    except OpenAIError as error:
        raise HTTPException(status_code=502, detail="The AI service is unavailable.") from error
