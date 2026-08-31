from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SalesChannelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bling_id: str
    name: str
    tipo: str | None
    agrupador: int | None
    situacao: int | None
    created_at: datetime
    updated_at: datetime
    last_synced_at: datetime | None
