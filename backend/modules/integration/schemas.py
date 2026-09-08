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
    eligible: int
    processed: int
    updated: int
    with_channel: int
    without_store: int
    unmatched_channel: int
    missing_local: int
    already_linked: int
    bling_not_found: int
    failed: int


class BackfillOrderItemsRequest(BaseModel):
    limit: int = 50
    after_external_id: str | None = None


class BackfillOrderItemsResponse(BaseModel):
    selected: int
    processed: int
    orders_enriched: int
    items_created: int
    unknown_products: int
    detail_without_items: int
    not_found: int
    failed: int
    remaining_without_items: int
    next_cursor: str | None
    has_more: bool


class SyncProductsBatchRequest(BaseModel):
    start_page: int = 1
    pages: int = 5


class SyncProductsBatchResponse(BaseModel):
    start_page: int
    end_page: int
    pages_processed: int
    fetched: int
    processed: int
    created: int
    updated: int
    skipped: int
    failed: int
    next_page: int | None
    has_more: bool
    natural_end: bool
    skip_reasons: dict[str, int]


class SyncCheckpointSummary(BaseModel):
    status: str
    last_completed_page: int | None = None
    totals: dict | None = None


class SyncStatusResponse(BaseModel):
    products_count: int
    orders_count: int
    order_items_count: int
    orders_without_items: int
    orders_without_channel: int
    zero_stock: int = 0
    products_last_synced_at: datetime | None = None
    orders_last_synced_at: datetime | None = None
    order_items_last_synced_at: datetime | None = None
    channels_last_synced_at: datetime | None = None
    product_checkpoint: SyncCheckpointSummary | None = None


class LockStatusResponse(BaseModel):
    locked: bool


class CheckpointResponse(BaseModel):
    entity: str
    current_page: int
    last_completed_page: int
    status: str
    totals: dict
    started_at: datetime | None
    updated_at: datetime
    finished_at: datetime | None
    error_message: str | None
    created_at: datetime


class SyncAllPhaseResponse(BaseModel):
    phase: str
    status: str
    items_processed: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_failed: int = 0
    items_skipped: int = 0
    error_message: str | None = None


class SyncAllReconciliationResponse(BaseModel):
    products_count: int
    orders_count: int
    order_items_count: int
    orders_without_items: int
    orders_without_channel: int
    zero_stock: int


class SyncAllResponse(BaseModel):
    overall_status: str
    phases: list[SyncAllPhaseResponse]
    reconciliation: SyncAllReconciliationResponse
