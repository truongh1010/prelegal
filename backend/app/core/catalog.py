import json

from pydantic import BaseModel

from app.core.config import settings


class CatalogEntry(BaseModel):
    name: str
    description: str
    filename: str


def read_catalog() -> list[CatalogEntry]:
    raw = json.loads(settings.catalog_path.read_text(encoding="utf-8"))
    return [CatalogEntry(**entry) for entry in raw]
