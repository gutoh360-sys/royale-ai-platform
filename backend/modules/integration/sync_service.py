import contextlib
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy.exc import IntegrityError

from backend.core.config.base import Settings
from backend.core.logging import get_logger
from backend.database.models.listing import Listing
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.database.models.product_channel import ProductChannel
from backend.database.models.sales_channel import SalesChannel
from backend.database.models.sync import SyncError, SyncLog
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.errors import ApiError
from backend.modules.integration.sync_repository import ISyncLogRepository, SyncDataRepository

TokenProvider = Callable[[], Awaitable[str]]


def decimal_of(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


UNCATEGORIZED_ID = "uncategorized"
UNCATEGORIZED_NAME = "Sem categoria"

_SENSITIVE_ERROR_VALUE = re.compile(
    r"(?im)\b(access_token|refresh_token|client_secret|authorization|password)\b"
    r"(\s*[:=]\s*)[^\r\n,;]*"
)
_SENSITIVE_QUOTED_ERROR_VALUE = re.compile(
    r"(?i)(?P<key_quote>['\"])(?P<key>access_token|refresh_token|client_secret|"
    r"authorization|password)(?P=key_quote)(?P<separator>\s*[:=]\s*)"
    r"(?P<value_quote>['\"])[^'\"]*(?P=value_quote)"
)
_BEARER_TOKEN = re.compile(r"(?i)bearer\s+[^\s,;]+")
_SENSITIVE_ERROR_KEYS = {
    "access_token",
    "refresh_token",
    "client_secret",
    "authorization",
    "password",
}

VALID_ENTITIES = (
    "products",
    "orders",
    "marketplaces",
    "product_channels",
    "listings",
)


@dataclass(frozen=True)
class SyncResult:
    entity: str
    sync_type: str
    status: str
    items_processed: int
    items_created: int
    items_updated: int
    items_failed: int
    items_skipped: int = 0
    error_message: str | None = None


@dataclass(frozen=True)
class BackfillResult:
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


@dataclass(frozen=True)
class BackfillOrderItemsResult:
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


@dataclass(frozen=True)
class SyncProductsBatchResult:
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


class IncompleteSyncItemError(Exception):
    """Raised when a synced item is missing required fields."""


class ProductIncompleteError(IncompleteSyncItemError):
    """Raised when a Bling product is missing required cadastral fields."""


class DuplicateSkuError(ValueError):
    """Raised when different Bling products use the same SKU."""


class OrderItemUnknownProductError(ValueError):
    """Raised when an order item references a product not present in the catalog."""


class OrderNotFoundError(ValueError):
    """Raised during backfill when external_id has no local Order."""


class BlingSyncService:
    def __init__(
        self,
        client: BlingApiClient,
        token_provider: TokenProvider,
        sync_log_repo: ISyncLogRepository,
        data_repo: SyncDataRepository,
        settings: Settings,
        *,
        order_days_back: int | None = None,
    ) -> None:
        self._client = client
        self._token_provider = token_provider
        self._sync_log_repo = sync_log_repo
        self._data_repo = data_repo
        self._settings = settings
        self._order_days_back = order_days_back
        self._logger = get_logger(__name__)
        self._situation_cache: dict[str, str] = {}
        self._active_log: SyncLog | None = None
        self._deferred_item_errors: list[tuple[dict[str, Any], str]] = []

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    @staticmethod
    def _parse_bling_datetime(value: Any) -> datetime | None:
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            dt = datetime.fromisoformat(value)
        except (ValueError, TypeError):
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt

    async def sync(self, entity: str, sync_type: str = "full") -> SyncResult:
        if entity not in VALID_ENTITIES:
            raise ValueError(f"Unsupported entity: {entity}")
        if entity == "products":
            return await self.sync_products(sync_type=sync_type)
        if entity == "orders":
            return await self.sync_orders()
        if entity == "marketplaces":
            return await self.sync_marketplaces()
        if entity == "product_channels":
            return await self.sync_product_channels()
        if entity == "listings":
            return await self.sync_listings()
        raise ValueError(f"Unsupported entity: {entity}")

    async def sync_products(self, sync_type: str = "full") -> SyncResult:
        return await self._run_sync(
            entity="products",
            sync_type=sync_type,
            fetch=lambda: self._client.fetch_products(
                self._token_provider, page_size=self._settings.BLING_SYNC_PAGE_SIZE
            ),
            upsert=self._upsert_product,
        )

    async def sync_products_batch(
        self,
        *,
        start_page: int = 1,
        pages: int = 5,
        page_size: int = 100,
    ) -> SyncProductsBatchResult:
        skip_reasons: dict[str, int] = {}
        processed = created = updated = skipped = failed = fetched = 0
        current_page = start_page
        natural_end = False

        for _ in range(pages):
            try:
                items = await self._client.fetch_products_page(
                    self._token_provider, page=current_page, page_size=page_size
                )
            except Exception as exc:
                self._log_failure_safely(
                    "bling_sync_products_batch_page_failed",
                    entity="products",
                    cause=exc,
                )
                failed += 1
                break

            fetched += len(items)

            if len(items) < page_size:
                natural_end = True

            for raw in items:
                try:
                    async with self._data_repo.session.begin_nested():
                        outcome = await self._upsert_product(raw)
                except IncompleteSyncItemError as exc:
                    skipped += 1
                    reason = self._classify_skip_reason(str(exc))
                    skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
                    continue
                except DuplicateSkuError:
                    skipped += 1
                    skip_reasons["duplicate_sku"] = skip_reasons.get("duplicate_sku", 0) + 1
                    continue
                except Exception as exc:
                    failed += 1
                    self._log_failure_safely(
                        "bling_sync_products_batch_item_failed",
                        entity="products",
                        cause=exc,
                    )
                    continue
                finally:
                    await self._record_deferred_item_errors()
                processed += 1
                if outcome == "created":
                    created += 1
                elif outcome == "updated":
                    updated += 1

            if natural_end:
                break

            current_page += 1

        has_more = not natural_end
        last_processed_page = current_page - 1 if has_more else current_page
        next_page = current_page if has_more else None
        actual_pages = (current_page - start_page) if natural_end else pages

        return SyncProductsBatchResult(
            start_page=start_page,
            end_page=last_processed_page,
            pages_processed=actual_pages,
            fetched=fetched,
            processed=processed,
            created=created,
            updated=updated,
            skipped=skipped,
            failed=failed,
            next_page=next_page,
            has_more=has_more,
            natural_end=natural_end,
            skip_reasons=skip_reasons,
        )

    @staticmethod
    def _classify_skip_reason(reason: str) -> str:
        lower = reason.lower()
        if "missing id" in lower:
            return "missing_id"
        if "missing codigo" in lower:
            return "missing_codigo"
        if "missing nome" in lower:
            return "missing_nome"
        return "other"

    async def sync_marketplaces(self, agrupador: int = 3) -> SyncResult:
        return await self._run_sync(
            entity="marketplaces",
            sync_type="full",
            fetch=lambda: self._client.fetch_channels(
                self._token_provider,
                agrupador=agrupador,
                page_size=self._settings.BLING_SYNC_PAGE_SIZE,
            ),
            upsert=lambda raw: self._upsert_channel(raw, agrupador=agrupador),
        )

    async def sync_product_channels(self) -> SyncResult:
        return await self._run_sync(
            entity="product_channels",
            sync_type="full",
            fetch=lambda: self._client.fetch_product_channels(
                self._token_provider, page_size=self._settings.BLING_SYNC_PAGE_SIZE
            ),
            upsert=self._upsert_product_channel,
        )

    async def sync_listings(self) -> SyncResult:
        return await self._run_sync(
            entity="listings",
            sync_type="full",
            fetch=self._fetch_listings,
            upsert=self._upsert_listing,
        )

    async def _fetch_listings(self) -> list[dict[str, Any]]:
        """Fetch listings for every synced marketplace channel.

        Bling requires ``idLoja`` and ``tipoIntegracao`` when listing anuncios,
        so we iterate over the channels persisted by ``sync_marketplaces``.
        Each channel is fetched independently so a 400 from one channel does
        not abort the others.
        """
        channels = await self._data_repo.list_channels()
        items: list[dict[str, Any]] = []
        for channel in channels:
            if not channel.tipo:
                continue
            try:
                channel_items = await self._client.fetch_listings(
                    self._token_provider,
                    id_loja=channel.bling_id,
                    tipo_integracao=channel.tipo,
                    page_size=self._settings.BLING_SYNC_PAGE_SIZE,
                )
                for item in channel_items:
                    item["_channel_bling_id"] = channel.bling_id
                    item["_tipo_integracao"] = channel.tipo
                items.extend(channel_items)
            except ApiError as exc:
                self._logger.warning(
                    "Skipping channel %s/%s: %s",
                    channel.bling_id,
                    channel.tipo,
                    exc,
                )
        return items

    async def sync_orders(self) -> SyncResult:
        days_back = self._order_days_back or self._settings.BLING_ORDER_SYNC_DAYS_BACK
        data_final = self._now().date()
        data_inicial = data_final - timedelta(days=days_back)
        return await self._run_sync(
            entity="orders",
            sync_type="incremental",
            fetch=lambda: self._client.fetch_orders(
                self._token_provider,
                page_size=self._settings.BLING_SYNC_PAGE_SIZE,
                data_inicial=data_inicial.isoformat(),
                data_final=data_final.isoformat(),
            ),
            upsert=self._upsert_order,
        )

    async def backfill_orders(self, external_ids: list[str]) -> BackfillResult:
        """Re-fetch specific orders from Bling by external_id and upsert.

        This is an administrative operation for orders that were missed by
        the incremental sync window. It only enriches EXISTING local orders
        that still have channel_id IS NULL. It never creates new orders and
        never overwrites an already-linked channel_id.
        """
        selected = len(external_ids)
        eligible = processed = updated = with_channel = 0
        without_store = unmatched_channel = missing_local = 0
        already_linked = bling_not_found = failed = 0

        for eid in external_ids:
            existing = await self._data_repo.find_order_by_external_id(eid)
            if existing is None:
                missing_local += 1
                continue

            if existing.channel_id is not None:
                already_linked += 1
                continue

            eligible += 1

            try:
                raw = await self._client.fetch_order(
                    self._token_provider, order_id=eid
                )
            except Exception as exc:
                failed += 1
                self._log_failure_safely(
                    "bling_backfill_order_fetch_failed",
                    entity="orders",
                    cause=exc,
                )
                continue

            if raw is None:
                bling_not_found += 1
                continue

            try:
                async with self._data_repo.session.begin_nested():
                    outcome = await self._upsert_order(
                        raw,
                        create_if_missing=False,
                        preserve_existing_channel=True,
                    )
            except OrderNotFoundError:
                missing_local += 1
                continue
            except Exception as exc:
                failed += 1
                self._log_failure_safely(
                    "bling_backfill_order_upsert_failed",
                    entity="orders",
                    cause=exc,
                )
                continue
            finally:
                await self._record_deferred_item_errors()

            processed += 1
            if outcome == "updated":
                updated += 1

            loja = raw.get("loja") or {}
            loja_id = str(loja.get("id") or "").strip() if isinstance(loja, dict) else ""
            if loja_id:
                ch = await self._data_repo.find_channel_by_bling_id(loja_id)
                if ch is not None:
                    with_channel += 1
                else:
                    unmatched_channel += 1
            else:
                without_store += 1

        return BackfillResult(
            selected=selected,
            eligible=eligible,
            processed=processed,
            updated=updated,
            with_channel=with_channel,
            without_store=without_store,
            unmatched_channel=unmatched_channel,
            missing_local=missing_local,
            already_linked=already_linked,
            bling_not_found=bling_not_found,
            failed=failed,
        )

    async def backfill_order_items(
        self, limit: int = 50, after_external_id: str | None = None
    ) -> BackfillOrderItemsResult:
        """Enrich existing orders with items from Bling detail endpoint.

        Only processes orders that have NO OrderItems. Uses cursor-based
        pagination for deterministic batching. Each order is isolated
        via SAVEPOINT so failures don't abort the batch.

        Fetches limit+1 to accurately determine has_more without false positives.
        """
        # Fetch one extra to detect if there are more records
        raw_orders = await self._data_repo.find_orders_without_items(
            limit=limit + 1, after_external_id=after_external_id
        )
        has_more = len(raw_orders) > limit
        orders = raw_orders[:limit]
        selected = len(orders)
        processed = orders_enriched = items_created = 0
        unknown_products = detail_without_items = not_found = failed = 0

        for order in orders:
            try:
                raw = await self._client.fetch_order(
                    self._token_provider, order_id=order.external_id
                )
            except Exception as exc:
                failed += 1
                self._log_failure_safely(
                    "bling_backfill_items_fetch_failed",
                    entity="orders",
                    cause=exc,
                )
                continue

            if raw is None:
                not_found += 1
                continue

            itens = raw.get("itens") or []
            if not isinstance(itens, list) or len(itens) == 0:
                detail_without_items += 1
                continue

            try:
                async with self._data_repo.session.begin_nested():
                    items_before = len(order.items)
                    await self._upsert_order_items(order, itens)
                    await self._data_repo.session.flush()
                    new_items = len(order.items) - items_before
                    if new_items > 0:
                        orders_enriched += 1
                        items_created += new_items
            except Exception as exc:
                failed += 1
                self._log_failure_safely(
                    "bling_backfill_items_upsert_failed",
                    entity="orders",
                    cause=exc,
                )
                continue
            finally:
                await self._record_deferred_item_errors()

            processed += 1

        # Count unknown product errors from this batch
        unknown_products = len(
            [e for e in self._deferred_item_errors if "product not found" in e[1]]
        )

        next_cursor = orders[-1].external_id if orders else None
        remaining_without_items = await self._data_repo.count_orders_without_items()

        return BackfillOrderItemsResult(
            selected=selected,
            processed=processed,
            orders_enriched=orders_enriched,
            items_created=items_created,
            unknown_products=unknown_products,
            detail_without_items=detail_without_items,
            not_found=not_found,
            failed=failed,
            remaining_without_items=remaining_without_items,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def _run_sync(
        self,
        *,
        entity: str,
        sync_type: str,
        fetch: Callable[[], Awaitable[list[dict[str, Any]]]],
        upsert: Callable[[dict[str, Any]], Awaitable[str]],
    ) -> SyncResult:
        log = SyncLog(sync_type=sync_type, entity=entity)
        await self._sync_log_repo.create(log)
        self._active_log = log
        processed = created = updated = failed = skipped = 0
        try:
            items = await fetch()
        except Exception as exc:
            _, fetch_error_message = self._safe_error_details(exc)
            await self._finalize_log(
                log,
                status="failed",
                processed=0,
                created=0,
                updated=0,
                failed=0,
                error_message=fetch_error_message,
            )
            self._log_failure_safely(f"bling_sync_{entity}_fetch_failed", entity=entity, cause=exc)
            return SyncResult(
                entity=entity,
                sync_type=sync_type,
                status="failed",
                items_processed=0,
                items_created=0,
                items_updated=0,
                items_failed=0,
                items_skipped=0,
                error_message=fetch_error_message,
            )

        for raw in items:
            try:
                async with self._data_repo.session.begin_nested():
                    outcome = await upsert(raw)
            except IncompleteSyncItemError as exc:
                skipped += 1
                await self._record_skip_safely(log, entity=entity, raw=raw, reason=str(exc))
                continue
            except Exception as exc:
                failed += 1
                self._log_failure_safely("bling_sync_item_failed", entity=entity, cause=exc)
                await self._record_error_safely(log, entity=entity, raw=raw, cause=exc)
                continue
            finally:
                await self._record_deferred_item_errors()
            processed += 1
            if outcome == "created":
                created += 1
            elif outcome == "updated":
                updated += 1

        result_status, error_message = await self._finalize_log(
            log,
            status="completed",
            processed=processed,
            created=created,
            updated=updated,
            failed=failed,
        )
        return SyncResult(
            entity=entity,
            sync_type=sync_type,
            status=result_status,
            items_processed=processed,
            items_created=created,
            items_updated=updated,
            items_failed=failed,
            items_skipped=skipped,
            error_message=error_message,
        )

    async def _finalize_log(
        self,
        log: SyncLog,
        *,
        status: str,
        processed: int,
        created: int,
        updated: int,
        failed: int,
        error_message: str | None = None,
    ) -> tuple[str, str | None]:
        entity = log.entity
        try:
            async with self._data_repo.session.begin_nested():
                self._set_log_result(
                    log,
                    status=status,
                    processed=processed,
                    created=created,
                    updated=updated,
                    failed=failed,
                    error_message=error_message,
                )
                await self._data_repo.session.flush()
            return status, error_message
        except Exception as exc:
            self._log_failure_safely("bling_sync_log_finalization_failed", entity=entity, cause=exc)

        fallback_message = "sync log finalization failed"
        try:
            async with self._data_repo.session.begin_nested():
                self._set_log_result(
                    log,
                    status="failed",
                    processed=processed,
                    created=created,
                    updated=updated,
                    failed=failed,
                    error_message=fallback_message,
                )
                await self._data_repo.session.flush()
        except Exception as exc:
            self._log_failure_safely("bling_sync_log_fallback_failed", entity=entity, cause=exc)
        return "failed", fallback_message

    def _set_log_result(
        self,
        log: SyncLog,
        *,
        status: str,
        processed: int,
        created: int,
        updated: int,
        failed: int,
        error_message: str | None,
    ) -> None:
        log.items_processed = processed
        log.items_created = created
        log.items_updated = updated
        log.items_failed = failed
        log.status = status
        log.error_message = error_message
        log.finished_at = self._now()

    async def _upsert_product(self, raw: dict[str, Any]) -> str:
        bling_id = str(raw.get("id") or "").strip()
        sku = str(raw.get("codigo") or "").strip()
        name = str(raw.get("nome") or "").strip()
        if not bling_id:
            raise ProductIncompleteError("product is missing id")
        if not sku:
            raise ProductIncompleteError("product is missing codigo")
        if not name:
            raise ProductIncompleteError("product is missing nome")

        category = await self._category_for(raw)
        if category is None:
            category = await self._data_repo.upsert_category(UNCATEGORIZED_ID, UNCATEGORIZED_NAME)

        existing = await self._data_repo.find_product_by_bling_id(bling_id)
        if existing is not None:
            product = existing
            action = "updated"
        else:
            existing = await self._data_repo.find_product_by_sku(sku)
            if existing is not None:
                raise DuplicateSkuError("SKU already belongs to a different Bling product")
            else:
                product = Product(bling_id=bling_id, sku=sku, name=name)
                action = "created"

        product.sku = sku
        product.name = name
        product.description = raw.get("descricao") or product.description
        product.ean = self._clean_ean(raw.get("gtin")) or product.ean
        product.category_id = category.id
        price = raw.get("preco")
        if isinstance(price, dict):
            sell = price.get("venda")
            if sell is not None:
                product.price = float(sell)
            cost = price.get("custo")
            if cost is not None:
                product.cost = float(cost)
        elif price is not None:
            product.price = float(price)
        product.stock_quantity = self._stock_quantity(raw)
        situation = str(raw.get("situacao") or "A").upper()
        product.active = situation in ("A", "ATIVO", "1", "S")
        product.last_synced_at = self._now()
        await self._data_repo.upsert_product(product)
        return action

    @staticmethod
    def _stock_quantity(raw: dict[str, Any]) -> int:
        stock = raw.get("estoque")
        value = None
        if isinstance(stock, dict):
            value = stock.get("saldoVirtualTotal")
        elif isinstance(stock, list) and stock and isinstance(stock[0], dict):
            value = stock[0].get("saldoVirtualTotal")
        if value is None:
            return 0
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _category_field(raw: dict[str, Any]) -> dict[str, Any] | None:
        field = raw.get("categoria")
        if isinstance(field, dict):
            return field
        return None

    async def _category_for(self, raw: dict[str, Any]) -> Any | None:
        field = self._category_field(raw)
        if field is None:
            return None
        bling_id = str(field.get("id") or "").strip()
        name = str(field.get("descricao") or "").strip()
        if not bling_id or not name:
            return None
        return await self._data_repo.upsert_category(bling_id, name)

    async def _upsert_channel(self, raw: dict[str, Any], agrupador: int = 3) -> str:
        bling_id = str(raw.get("id") or "").strip()
        name = str(raw.get("descricao") or "").strip()
        if not bling_id:
            raise IncompleteSyncItemError("channel is missing id")
        if not name:
            raise IncompleteSyncItemError("channel is missing descricao")

        existing = await self._data_repo.find_channel_by_bling_id(bling_id)
        if existing is not None:
            channel = existing
            action = "updated"
        else:
            channel = SalesChannel(bling_id=bling_id, name=name)
            action = "created"

        channel.name = name
        channel.tipo = self._clean_text(raw.get("tipo"), max_len=50)
        channel.agrupador = self._as_optional_int(raw.get("agrupador")) or agrupador
        channel.situacao = self._as_optional_int(raw.get("situacao"))
        channel.last_synced_at = self._now()
        await self._data_repo.upsert_channel(channel)
        return action

    async def _upsert_product_channel(self, raw: dict[str, Any]) -> str:
        bling_id = str(raw.get("id") or "").strip()
        if not bling_id:
            raise IncompleteSyncItemError("product channel is missing id")

        product_field = raw.get("produto") or {}
        product_bling_id = (
            str(product_field.get("id") or "").strip() if isinstance(product_field, dict) else ""
        )
        loja_field = raw.get("loja") or {}
        channel_bling_id = (
            str(loja_field.get("id") or "").strip() if isinstance(loja_field, dict) else ""
        )
        if not product_bling_id:
            raise IncompleteSyncItemError("product channel is missing produto.id")
        if not channel_bling_id:
            raise IncompleteSyncItemError("product channel is missing loja.id")

        product = await self._data_repo.find_product_by_bling_id(product_bling_id)
        if product is None:
            raise IncompleteSyncItemError(
                f"product channel references unknown product bling_id={product_bling_id}"
            )
        channel = await self._data_repo.find_channel_by_bling_id(channel_bling_id)
        if channel is None:
            raise IncompleteSyncItemError(
                f"product channel references unknown channel bling_id={channel_bling_id}"
            )

        existing = await self._data_repo.find_product_channel_by_bling_id(bling_id)
        if existing is not None:
            link = existing
            action = "updated"
        else:
            link = ProductChannel(
                bling_id=bling_id,
                product_id=product.id,
                channel_id=channel.id,
            )
            action = "created"

        link.product_id = product.id
        link.channel_id = channel.id
        link.codigo = self._clean_text(raw.get("codigo"), max_len=100)
        link.preco = self._as_optional_decimal(raw.get("preco"))
        link.preco_promocional = self._as_optional_decimal(raw.get("precoPromocional"))
        categorias = raw.get("categoriasProdutos")
        if isinstance(categorias, list):
            link.categoria_ids = [
                str(cat.get("id"))
                for cat in categorias
                if isinstance(cat, dict) and cat.get("id") is not None
            ] or None
        link.last_synced_at = self._now()
        await self._data_repo.upsert_product_channel(link)
        return action

    async def _upsert_listing(self, raw: dict[str, Any]) -> str:
        bling_id = str(raw.get("id") or "").strip()
        if not bling_id:
            raise IncompleteSyncItemError("listing is missing id")

        existing = await self._data_repo.find_listing_by_bling_id(bling_id)
        if existing is not None:
            listing = existing
            action = "updated"
        else:
            listing = Listing(bling_id=bling_id)
            action = "created"

        channel_bling_id = str(raw.get("_channel_bling_id") or "").strip() or None
        tipo_integracao = str(raw.get("_tipo_integracao") or "").strip() or None
        listing.channel_bling_id = channel_bling_id
        channel = (
            await self._data_repo.find_channel_by_bling_id(channel_bling_id)
            if channel_bling_id
            else None
        )
        listing.channel_id = channel.id if channel else None
        listing.title = self._clean_text(raw.get("titulo"), max_len=200)
        listing.status = self._as_optional_int(raw.get("situacao"))
        listing.price = self._as_optional_decimal(raw.get("preco"))
        listing.external_code = self._clean_text(raw.get("codigo"), max_len=100)
        listing.attributes = self._listing_attributes(raw.get("atributos"))
        listing.last_synced_at = self._now()

        product_bling_id = await self._resolve_listing_product_bling_id(
            bling_id, channel_bling_id, tipo_integracao
        )
        listing.product_bling_id = product_bling_id
        product = (
            await self._data_repo.find_product_by_bling_id(product_bling_id)
            if product_bling_id
            else None
        )
        listing.product_id = product.id if product else None

        await self._data_repo.upsert_listing(listing)
        return action

    async def _resolve_listing_product_bling_id(
        self,
        listing_id: str,
        channel_bling_id: str | None,
        tipo_integracao: str | None,
    ) -> str | None:
        if not channel_bling_id or not tipo_integracao:
            return None
        try:
            detail = await self._client.fetch_listing_detail(
                self._token_provider,
                listing_id=listing_id,
                id_loja=channel_bling_id,
                tipo_integracao=tipo_integracao,
            )
        except ApiError:
            return None
        if detail is None:
            return None
        product_field = detail.get("produto") or {}
        if isinstance(product_field, dict):
            return str(product_field.get("id") or "").strip() or None
        return None

    @staticmethod
    def _listing_attributes(raw: Any) -> dict[str, Any] | None:
        if not isinstance(raw, list):
            return None
        attributes: dict[str, Any] = {}
        for attr in raw:
            if isinstance(attr, dict) and attr.get("id") is not None:
                attributes[str(attr["id"])] = attr
        return attributes or None

    @staticmethod
    def _as_optional_int(value: Any) -> int | None:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _as_optional_decimal(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    async def _upsert_order(
        self,
        raw: dict[str, Any],
        *,
        create_if_missing: bool = True,
        preserve_existing_channel: bool = False,
    ) -> str:
        from uuid import uuid4

        external_id = str(raw.get("id"))
        if not external_id:
            raise ValueError("order is missing id")

        customer = raw.get("contato") or {}
        order_number = str(raw.get("numero") or external_id)
        bling_date = self._parse_bling_datetime(raw.get("data"))
        order = await self._data_repo.find_order_by_external_id(external_id)
        if order is None:
            if not create_if_missing:
                raise OrderNotFoundError(
                    f"order with external_id={external_id} does not exist locally"
                )
            order = Order(
                id=uuid4(),
                external_id=external_id,
                marketplace="bling",
                order_number=order_number,
                customer_name=str(customer.get("nome") or "Cliente"),
                ordered_at=bling_date or self._now(),
            )
            self._data_repo.session.add(order)
            await self._data_repo.session.flush()
            action = "created"
        else:
            action = "updated"
            if bling_date is not None:
                order.ordered_at = bling_date

        order.customer_document = self._clean_text(customer.get("numeroDocumento"))
        order.customer_email = self._clean_text(customer.get("email"))
        order.customer_phone = self._clean_text(customer.get("celular"))
        order.status = await self._order_status(raw)
        total = raw.get("total") or {}
        if isinstance(total, dict):
            if total.get("valor") is not None:
                order.total_amount = float(total["valor"])
            if total.get("desconto") is not None:
                order.discount_amount = float(total["desconto"])
            if total.get("frete") is not None:
                order.shipping_amount = float(total["frete"])
        elif total is not None:
            order.total_amount = float(total)
        order.last_synced_at = self._now()

        if not (preserve_existing_channel and order.channel_id is not None):
            loja = raw.get("loja") or {}
            if isinstance(loja, dict):
                loja_id = str(loja.get("id") or "").strip()
                if loja_id:
                    channel = await self._data_repo.find_channel_by_bling_id(loja_id)
                    if channel is not None:
                        order.channel_id = channel.id

        items = raw.get("itens") or []
        if isinstance(items, list):
            await self._upsert_order_items(order, items)

        # Only fetch detail for NEW orders created in this sync.
        # Existing orders without items are handled by backfill-order-items.
        if action == "created" and not items:
            try:
                detail = await self._client.fetch_order(
                    self._token_provider, order_id=external_id
                )
                if detail is not None:
                    detail_items = detail.get("itens") or []
                    if isinstance(detail_items, list) and detail_items:
                        await self._upsert_order_items(order, detail_items)
            except Exception:
                pass  # Best effort - don't fail the order upsert

        await self._data_repo.session.flush()
        return action

    async def _upsert_order_items(self, order: Order, items: list[Any]) -> None:
        for item in items:
            if not isinstance(item, dict):
                continue
            try:
                await self._upsert_order_item(order, item)
            except OrderItemUnknownProductError as exc:
                self._deferred_item_errors.append((item, str(exc)))

    async def _upsert_order_item(self, order: Order, raw: dict[str, Any]) -> None:
        item_sku = str(raw.get("codigo") or "")
        if item_sku:
            existing = await self._data_repo.find_order_item(order.id, item_sku)
            if existing is not None:
                await self._update_item(existing, raw)
                return
        sku = item_sku or None
        product_field = raw.get("produto")
        bling_id = None
        if isinstance(product_field, dict) and product_field.get("id") is not None:
            bling_id = str(product_field["id"])
        product = await self._data_repo.find_product_by_sku(sku) if sku else None
        if product is None and bling_id:
            product = await self._data_repo.find_product_by_bling_id(bling_id)
        if product is None:
            raise OrderItemUnknownProductError(
                f"order item product not found for sku={sku or bling_id}"
            )
        product_name = str(raw.get("descricao") or raw.get("produto", {}).get("nome") or "")
        unit_price = decimal_of(raw.get("valor"))
        quantity = int(raw.get("quantidade") or 1)
        discount = decimal_of(raw.get("desconto"))
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            sku=sku or product.sku,
            product_name=product_name or product.name,
            quantity=quantity,
            unit_price=unit_price,
            total_price=float(unit_price * quantity - discount),
        )
        self._data_repo.session.add(item)

    async def _update_item(self, item: OrderItem, raw: dict[str, Any]) -> None:
        item.quantity = int(raw.get("quantidade") or item.quantity)
        if raw.get("valor") is not None:
            item.unit_price = float(raw["valor"])
        if raw.get("total") is not None:
            item.total_price = float(raw["total"])

    _BLING_VALOR_TO_STATUS: dict[int, str] = {
        0: "pending",
        1: "completed",
        2: "cancelled",
        3: "pending",
        5: "pending",
        6: "pending",
        7: "pending",
        8: "pending",
        10: "pending",
        11: "pending",
        12: "pending",
    }

    async def _order_status(self, raw: dict[str, Any]) -> str:
        situation = raw.get("situacao") or {}
        if isinstance(situation, dict):
            valor = situation.get("valor")
            if isinstance(valor, int):
                mapped = self._BLING_VALOR_TO_STATUS.get(valor)
                if mapped is not None:
                    return mapped
                self._logger.warning(
                    "Unknown Bling situation valor=%s, defaulting to pending",
                    valor,
                )
                return "pending"
            description = str(situation.get("descricao") or "").lower()
            situation_id = situation.get("id")
            if not description and situation_id is not None:
                description = await self._situation_description(str(situation_id))
            if "conclu" in description or "finaliz" in description or "atendido" in description:
                return "completed"
            if "cancel" in description:
                return "cancelled"
            return "pending"
        return "pending"

    async def _situation_description(self, situation_id: str) -> str:
        cached = self._situation_cache.get(situation_id)
        if cached is not None:
            return cached
        description = ""
        try:
            situation = await self._client.fetch_situation(self._token_provider, situation_id)
        except ApiError:
            situation = None
        if situation is not None:
            description = str(situation.get("nome") or "").lower()
        self._situation_cache[situation_id] = description
        return description

    async def _record_error_safely(
        self,
        log: SyncLog,
        entity: str,
        raw: dict[str, Any],
        cause: Exception,
    ) -> None:
        try:
            async with self._data_repo.session.begin_nested():
                await self._record_error(log, entity=entity, raw=raw, cause=cause)
        except Exception as exc:
            self._log_failure_safely("bling_sync_error_record_failed", entity=entity, cause=exc)

    async def _record_error(
        self,
        log: SyncLog,
        entity: str,
        raw: dict[str, Any],
        cause: Exception,
    ) -> None:
        error_type, error_message = self._safe_error_details(cause)
        error = SyncError(
            sync_log_id=log.id,
            entity=entity,
            external_id=str(raw.get("id") or "")[:50],
            error_type=error_type,
            error_message=error_message,
            raw_data=self._safe_raw_data(raw),
        )
        self._data_repo.session.add(error)
        await self._data_repo.session.flush()

    @staticmethod
    def _safe_error_details(cause: Exception) -> tuple[str, str]:
        error_type = type(cause).__name__[:50]
        if isinstance(cause, IntegrityError):
            return error_type, "database constraint violation"
        message = str(cause).strip() or "item processing failed"
        message = _SENSITIVE_QUOTED_ERROR_VALUE.sub(
            lambda match: (
                f"{match.group('key_quote')}{match.group('key')}"
                f"{match.group('key_quote')}{match.group('separator')}"
                f"{match.group('value_quote')}[REDACTED]{match.group('value_quote')}"
            ),
            message,
        )
        message = _SENSITIVE_ERROR_VALUE.sub(r"\1\2[REDACTED]", message)
        message = _BEARER_TOKEN.sub("Bearer [REDACTED]", message)
        return error_type, message[:2000]

    @classmethod
    def _safe_raw_data(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return {
                str(key): "[REDACTED]"
                if str(key).lower() in _SENSITIVE_ERROR_KEYS
                else cls._safe_raw_data(item)
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [cls._safe_raw_data(item) for item in value]
        return value

    def _log_failure_safely(self, event: str, *, entity: str, cause: Exception) -> None:
        with contextlib.suppress(Exception):
            error_type, error_message = self._safe_error_details(cause)
            sanitized = RuntimeError(f"{error_type}: {error_message}")
            self._logger.error(
                event,
                entity=entity,
                error_type=error_type,
                error_message=error_message,
                exc_info=(RuntimeError, sanitized, cause.__traceback__),
            )

    async def _record_item_error_safely(self, raw: dict[str, Any], reason: str) -> None:
        try:
            async with self._data_repo.session.begin_nested():
                await self._record_item_error(raw, reason=reason)
        except Exception as exc:
            self._log_failure_safely(
                "bling_sync_order_item_error_record_failed", entity="orders", cause=exc
            )

    async def _record_deferred_item_errors(self) -> None:
        errors, self._deferred_item_errors = self._deferred_item_errors, []
        for raw, reason in errors:
            await self._record_item_error_safely(raw, reason=reason)

    async def _record_item_error(self, raw: dict[str, Any], reason: str) -> None:
        log = self._active_log
        if log is None:
            return
        error = SyncError(
            sync_log_id=log.id,
            entity="orders",
            external_id=str(raw.get("id") or "")[:50],
            error_type="order_item_unknown_product",
            error_message=reason,
            raw_data=self._safe_raw_data(raw),
        )
        self._data_repo.session.add(error)
        await self._data_repo.session.flush()

    async def _record_skip(
        self, log: SyncLog, entity: str, raw: dict[str, Any], reason: str
    ) -> None:
        error = SyncError(
            sync_log_id=log.id,
            entity=entity,
            external_id=str(raw.get("id") or "")[:50],
            error_type="product_incomplete",
            error_message=reason,
            raw_data=self._safe_raw_data(raw),
        )
        self._data_repo.session.add(error)
        await self._data_repo.session.flush()

    async def _record_skip_safely(
        self, log: SyncLog, entity: str, raw: dict[str, Any], reason: str
    ) -> None:
        try:
            async with self._data_repo.session.begin_nested():
                await self._record_skip(log, entity=entity, raw=raw, reason=reason)
        except Exception as exc:
            self._log_failure_safely("bling_sync_skip_record_failed", entity=entity, cause=exc)

    @staticmethod
    def _clean_ean(value: Any) -> str | None:
        if value is None:
            return None
        digits = "".join(ch for ch in str(value) if ch.isdigit())
        return digits[:13] or None

    @staticmethod
    def _clean_text(value: Any, max_len: int = 200) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text[:max_len] if text else None
