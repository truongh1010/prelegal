from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.api.routes.chat import ChatMessage
from app.core.auth import get_current_user
from app.core.database import get_session
from app.core.documents import get_document as get_document_spec
from app.models.document import Document
from app.models.user import User

router = APIRouter()


class CreateDocumentRequest(BaseModel):
    template: str


class DocumentSummary(BaseModel):
    id: int
    template: str
    template_name: str
    fields: dict[str, str | None]
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentSummary):
    messages: list[ChatMessage]


def _to_summary(document: Document) -> DocumentSummary:
    spec = get_document_spec(document.template)
    return DocumentSummary(
        id=document.id,
        template=document.template,
        template_name=spec.name if spec else document.template,
        fields=document.fields,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def get_owned_document(db: DbSession, document_id: int, user: User) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.user_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


@router.post("/documents", status_code=201)
def create_document(
    request: CreateDocumentRequest,
    user: User = Depends(get_current_user),
    db: DbSession = Depends(get_session),
) -> DocumentDetail:
    if get_document_spec(request.template) is None:
        raise HTTPException(status_code=404, detail=f'Unknown template "{request.template}".')

    document = Document(user_id=user.id, template=request.template)
    db.add(document)
    db.commit()
    db.refresh(document)
    return DocumentDetail(**_to_summary(document).model_dump(), messages=[])


@router.get("/documents")
def list_documents(
    user: User = Depends(get_current_user), db: DbSession = Depends(get_session)
) -> list[DocumentSummary]:
    documents = db.exec(
        select(Document).where(Document.user_id == user.id).order_by(Document.updated_at.desc())
    ).all()
    return [_to_summary(document) for document in documents]


@router.get("/documents/{document_id}")
def get_document_route(
    document_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_session)
) -> DocumentDetail:
    document = get_owned_document(db, document_id, user)
    return DocumentDetail(**_to_summary(document).model_dump(), messages=document.messages)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int, user: User = Depends(get_current_user), db: DbSession = Depends(get_session)
) -> None:
    document = get_owned_document(db, document_id, user)
    db.delete(document)
    db.commit()
