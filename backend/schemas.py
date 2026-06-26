# backend/schemas.py

from pydantic import BaseModel


class ManualInjectRequest(BaseModel):
    asset_id: int
    source_id: int
    event_type: str
    summary: str