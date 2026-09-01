from datetime import datetime

from pydantic import BaseModel


class AuthorizationUrlResponse(BaseModel):
    authorization_url: str


class CallbackResponse(BaseModel):
    status: str
    message: str


class ConnectionStatusResponse(BaseModel):
    provider: str
    status: str
    connected: bool
    last_authenticated_at: datetime | None
    scopes: list[str] | None


class ConnectionTestResponse(BaseModel):
    status: str
    detail: str


class SyncTriggerResponse(BaseModel):
    entity: str
    sync_type: str
    status: str
    items_processed: int
    items_created: int
    items_updated: int
    items_failed: int
    items_skipped: int = 0
    error_message: str | None = None


class BackfillOrdersRequest(BaseModel):
    external_ids: list[str]


class BackfillOrdersResponse(BaseModel):
    selected: int
    processed: int
    updated: int
    with_channel: int
    without_store: int
    unmatched_channel: int
    not_found: int
    failed: int
