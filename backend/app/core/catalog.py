import json
from pathlib import Path

from pydantic import BaseModel

# backend/app/core/catalog.py -> backend/app/core -> backend/app -> backend -> repo root.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_CATALOG_PATH = _REPO_ROOT / "catalog.json"


class CatalogEntry(BaseModel):
    name: str
    description: str
    filename: str


def read_catalog() -> list[CatalogEntry]:
    raw = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    return [CatalogEntry(**entry) for entry in raw]
