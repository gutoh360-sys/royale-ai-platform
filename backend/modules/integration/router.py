from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.core.security.deps import require_admin_auth
from backend.modules.integration.di import (
    get_bling_sync_service,
    get_integration_connection_service,
)
from backend.modules.integration.errors import (
    OAuthExchangeError,
    OAuthPermanentError,
    OAuthStateError,
    TokenRevocationError,
)
from backend.modules.integration.schemas import (
    AuthorizationUrlResponse,
    BackfillOrdersRequest,
    BackfillOrdersResponse,
    CallbackResponse,
    ConnectionStatusResponse,
    ConnectionTestResponse,
    SyncTriggerResponse,
)
from backend.modules.integration.service import IntegrationConnectionService
from backend.modules.integration.sync_service import BlingSyncService

router = APIRouter(prefix="/integrations/bling", tags=["integrations"])


@router.get(
    "/authorize",
    response_model=AuthorizationUrlResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def authorize(
    service: IntegrationConnectionService = Depends(get_integration_connection_service),
) -> AuthorizationUrlResponse:
    result = await service.build_authorization_url()
    return AuthorizationUrlResponse(authorization_url=result.url)


@router.get("/callback", response_model=CallbackResponse)
async def callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    service: IntegrationConnectionService = Depends(get_integration_connection_service),
) -> CallbackResponse:
    try:
        result = await service.handle_callback(
            code=code, state=state, error=error, error_description=error_description
        )
    except OAuthStateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OAuthExchangeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to complete authorization with Bling",
        ) from exc
    return CallbackResponse(status=result.status, message=result.message)


@router.get(
    "/status",
    response_model=ConnectionStatusResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_connection_status(
    service: IntegrationConnectionService = Depends(get_integration_connection_service),
) -> ConnectionStatusResponse:
    result = await service.get_status()
    return ConnectionStatusResponse(
        provider=result.provider,
        status=result.status,
        connected=result.connected,
        last_authenticated_at=result.last_authenticated_at,
        scopes=result.scopes,
    )


@router.post(
    "/disconnect",
    response_model=ConnectionStatusResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def disconnect(
    service: IntegrationConnectionService = Depends(get_integration_connection_service),
) -> ConnectionStatusResponse:
    try:
        await service.disconnect()
    except TokenRevocationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to revoke Bling tokens; connection was not disconnected",
        ) from exc
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    result = await service.get_status()
    return ConnectionStatusResponse(
        provider=result.provider,
        status=result.status,
        connected=result.connected,
        last_authenticated_at=result.last_authenticated_at,
        scopes=result.scopes,
    )


@router.get(
    "/test",
    response_model=ConnectionTestResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def test_connection(
    service: IntegrationConnectionService = Depends(get_integration_connection_service),
) -> ConnectionTestResponse:
    result = await service.test_connection()
    return ConnectionTestResponse(status=result.status, detail=result.detail)


@router.post(
    "/sync/{entity}",
    response_model=SyncTriggerResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def trigger_sync(
    entity: str,
    service: BlingSyncService = Depends(get_bling_sync_service),
) -> SyncTriggerResponse:
    if entity not in ("products", "orders", "marketplaces", "product_channels", "listings"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "entity must be one of: products, orders, marketplaces, product_channels, listings"
            ),
        )
    try:
        result = await service.sync(entity=entity)
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return SyncTriggerResponse(
        entity=result.entity,
        sync_type=result.sync_type,
        status=result.status,
        items_processed=result.items_processed,
        items_created=result.items_created,
        items_updated=result.items_updated,
        items_failed=result.items_failed,
        items_skipped=result.items_skipped,
        error_message=result.error_message,
    )


@router.post(
    "/backfill-orders",
    response_model=BackfillOrdersResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def backfill_orders(
    body: BackfillOrdersRequest,
    service: BlingSyncService = Depends(get_bling_sync_service),
) -> BackfillOrdersResponse:
    if not body.external_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="external_ids must not be empty",
        )
    if len(body.external_ids) > 500:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="external_ids must not exceed 500 items",
        )
    try:
        result = await service.backfill_orders(body.external_ids)
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return BackfillOrdersResponse(
        selected=result.selected,
        eligible=result.eligible,
        processed=result.processed,
        updated=result.updated,
        with_channel=result.with_channel,
        without_store=result.without_store,
        unmatched_channel=result.unmatched_channel,
        missing_local=result.missing_local,
        already_linked=result.already_linked,
        bling_not_found=result.bling_not_found,
        failed=result.failed,
    )
