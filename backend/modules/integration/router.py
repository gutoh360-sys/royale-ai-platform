from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.core.security.deps import require_admin_auth
from backend.modules.integration.checkpoint import CheckpointRepository
from backend.modules.integration.di import (
    get_bling_sync_service,
    get_checkpoint_repository,
    get_integration_connection_service,
)
from backend.modules.integration.errors import (
    OAuthExchangeError,
    OAuthPermanentError,
    OAuthStateError,
    TokenRevocationError,
)
from backend.modules.integration.locks import SyncLock
from backend.modules.integration.schemas import (
    AuthorizationUrlResponse,
    BackfillOrderItemsRequest,
    BackfillOrderItemsResponse,
    BackfillOrdersRequest,
    BackfillOrdersResponse,
    CallbackResponse,
    CheckpointResponse,
    ConnectionStatusResponse,
    ConnectionTestResponse,
    LockStatusResponse,
    SyncAllPhaseResponse,
    SyncAllReconciliationResponse,
    SyncAllResponse,
    SyncProductsBatchRequest,
    SyncProductsBatchResponse,
    SyncStatusResponse,
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
    response_model=SyncTriggerResponse | SyncProductsBatchResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def trigger_sync(
    entity: str,
    service: BlingSyncService = Depends(get_bling_sync_service),
    checkpoint_repo: CheckpointRepository = Depends(get_checkpoint_repository),
    operation_id: str | None = Query(default=None),
) -> SyncTriggerResponse | SyncProductsBatchResponse:
    if entity == "products":
        from dataclasses import asdict

        return SyncProductsBatchResponse(
            **asdict(await service.sync_product_request(checkpoint_repo, operation_id))
        )
    await checkpoint_repo.acquire_guard()
    if entity not in ("products", "orders", "marketplaces", "product_channels", "listings"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "entity must be one of: products, orders, marketplaces, product_channels, listings"
            ),
        )
    lock = SyncLock("sync")
    if not await lock.acquire():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sincronização em andamento. Aguarde a conclusão.",
        )
    try:
        result = await service.sync(entity=entity)
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await lock.release()
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
    "/sync-all",
    response_model=SyncAllResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def sync_all(
    service: BlingSyncService = Depends(get_bling_sync_service),
    checkpoint_repo: CheckpointRepository = Depends(get_checkpoint_repository),
    operation_id: str | None = Query(default=None),
) -> SyncAllResponse:
    lock = SyncLock("sync")
    if not await lock.acquire():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sincronização em andamento. Aguarde a conclusão.",
        )
    try:
        result = await service.sync_all(checkpoint_repo=checkpoint_repo, operation_id=operation_id)
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await lock.release()
    from dataclasses import asdict

    return SyncAllResponse(
        order_items_batch=BackfillOrderItemsResponse(**asdict(result.order_items_batch))
        if result.order_items_batch
        else None,
        product_batch=SyncProductsBatchResponse(**asdict(result.product_batch))
        if result.product_batch
        else None,
        overall_status=result.overall_status,
        phases=[
            SyncAllPhaseResponse(
                phase=p.phase,
                status=p.status,
                items_processed=p.items_processed,
                items_created=p.items_created,
                items_updated=p.items_updated,
                items_failed=p.items_failed,
                items_skipped=p.items_skipped,
                error_message=p.error_message,
            )
            for p in result.phases
        ],
        reconciliation=SyncAllReconciliationResponse(
            products_count=result.reconciliation.products_count,
            orders_count=result.reconciliation.orders_count,
            order_items_count=result.reconciliation.order_items_count,
            orders_without_items=result.reconciliation.orders_without_items,
            orders_without_channel=result.reconciliation.orders_without_channel,
            zero_stock=result.reconciliation.zero_stock,
        ),
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


@router.post(
    "/backfill-order-items",
    response_model=BackfillOrderItemsResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def backfill_order_items(
    body: BackfillOrderItemsRequest,
    service: BlingSyncService = Depends(get_bling_sync_service),
    checkpoint_repo: CheckpointRepository = Depends(get_checkpoint_repository),
) -> BackfillOrderItemsResponse:
    if body.limit < 1 or body.limit > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="limit must be between 1 and 100",
        )

    lock = SyncLock("sync")
    if not await lock.acquire():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sincronização em andamento. Aguarde a conclusão.",
        )
    try:
        result = await service.backfill_order_item_request(
            checkpoint_repo,
            operation_id=body.operation_id,
            limit=body.limit,
            cursor=body.after_external_id,
        )
    except OAuthPermanentError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await lock.release()
    return BackfillOrderItemsResponse(
        operation_id=result.operation_id,
        selected=result.selected,
        processed=result.processed,
        orders_enriched=result.orders_enriched,
        items_created=result.items_created,
        unknown_products=result.unknown_products,
        detail_without_items=result.detail_without_items,
        not_found=result.not_found,
        failed=result.failed,
        remaining_without_items=result.remaining_without_items,
        next_cursor=result.next_cursor,
        has_more=result.has_more,
    )


@router.post(
    "/sync-products-batch",
    response_model=SyncProductsBatchResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def sync_products_batch(
    body: SyncProductsBatchRequest,
    service: BlingSyncService = Depends(get_bling_sync_service),
    checkpoint_repo: CheckpointRepository = Depends(get_checkpoint_repository),
) -> SyncProductsBatchResponse:
    if body.start_page < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_page must be >= 1",
        )
    if body.pages < 1 or body.pages > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="pages must be between 1 and 5",
        )

    lock = SyncLock("sync")
    if not await lock.acquire():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sincronização em andamento. Aguarde a conclusão.",
        )

    try:
        result = await service.sync_product_request(checkpoint_repo, body.operation_id, body.pages)
    finally:
        await lock.release()

    return SyncProductsBatchResponse(
        operation_id=result.operation_id,
        start_page=result.start_page,
        end_page=result.end_page,
        pages_processed=result.pages_processed,
        fetched=result.fetched,
        processed=result.processed,
        created=result.created,
        updated=result.updated,
        skipped=result.skipped,
        failed=result.failed,
        next_page=result.next_page,
        has_more=result.has_more,
        natural_end=result.natural_end,
        skip_reasons=result.skip_reasons,
    )


@router.get(
    "/sync-status",
    response_model=SyncStatusResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_sync_status(
    service: BlingSyncService = Depends(get_bling_sync_service),
    checkpoint_repo: CheckpointRepository = Depends(get_checkpoint_repository),
) -> SyncStatusResponse:
    return await service.get_sync_status(checkpoint_repo=checkpoint_repo)


@router.get(
    "/lock-status",
    response_model=LockStatusResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_lock_status() -> LockStatusResponse:
    lock = SyncLock("sync")
    return LockStatusResponse(locked=await lock.is_locked())


@router.get(
    "/checkpoint/{entity}",
    response_model=CheckpointResponse,
    dependencies=[Depends(require_admin_auth)],
)
async def get_checkpoint(
    entity: str,
    repo: CheckpointRepository = Depends(get_checkpoint_repository),
) -> CheckpointResponse:
    checkpoint = await repo.get(entity)
    if checkpoint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No checkpoint found for entity '{entity}'",
        )
    return CheckpointResponse(
        entity=checkpoint.entity,
        current_page=checkpoint.current_page,
        last_completed_page=checkpoint.last_completed_page,
        status=checkpoint.status,
        totals=checkpoint.totals or {},
        started_at=checkpoint.started_at,
        updated_at=checkpoint.updated_at,
        finished_at=checkpoint.finished_at,
        error_message=checkpoint.error_message,
        created_at=checkpoint.created_at,
    )
