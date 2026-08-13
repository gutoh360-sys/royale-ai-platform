from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from backend.core.config.base import Settings
from backend.core.logging import get_logger
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.database.models.sync import SyncError, SyncLog
from backend.modules.integration.client import BlingApiClient
from backend.modules.integration.sync_repository import ISyncLogRepository, SyncDataRepository

TokenProvider = Callable[[], Awaitable[str]]


def decimal_of(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


UNCATEGORIZED_ID = "uncategorized"
UNCATEGORIZED_NAME = "Sem categoria"

VALID_ENTITIES = ("products", "orders")


@dataclass(frozen=True)
class SyncResult:
    entity: str
    sync_type: str
    status: str
    items_processed: int
    items_created: int
    items_updated: int
    items_failed: int
    error_message: str | None = None


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

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    async def sync(self, entity: str, sync_type: str = "full") -> SyncResult:
        if entity not in VALID_ENTITIES:
            raise ValueError(f"Unsupported entity: {entity}")
        if entity == "products":
            return await self.sync_products(sync_type=sync_type)
        return await self.sync_orders()

    async def sync_products(self, sync_type: str = "full") -> SyncResult:
        return await self._run_sync(
            entity="products",
            sync_type=sync_type,
            fetch=lambda: self._client.fetch_products(
                self._token_provider, page_size=self._settings.BLING_SYNC_PAGE_SIZE
            ),
            upsert=self._upsert_product,
        )

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
        processed = created = updated = failed = 0
        try:
            items = await fetch()
        except Exception as exc:
            log.status = "failed"
            log.error_message = str(exc)
            log.finished_at = self._now()
            await self._data_repo.session.flush()
            self._logger.error(f"bling_sync_{entity}_fetch_failed", error=str(exc))
            return SyncResult(
                entity=entity,
                sync_type=sync_type,
                status="failed",
                items_processed=0,
                items_created=0,
                items_updated=0,
                items_failed=0,
                error_message=str(exc),
            )

        for raw in items:
            try:
                outcome = await upsert(raw)
            except Exception:
                failed += 1
                await self._record_error(log, entity=entity, raw=raw)
                continue
            processed += 1
            if outcome == "created":
                created += 1
            elif outcome == "updated":
                updated += 1

        log.items_processed = processed
        log.items_created = created
        log.items_updated = updated
        log.items_failed = failed
        log.status = "completed"
        log.finished_at = self._now()
        await self._data_repo.session.flush()
        return SyncResult(
            entity=entity,
            sync_type=sync_type,
            status="completed",
            items_processed=processed,
            items_created=created,
            items_updated=updated,
            items_failed=failed,
        )

    async def _upsert_product(self, raw: dict[str, Any]) -> str:
        bling_id = str(raw.get("id"))
        sku = str(raw.get("codigo") or "").strip()
        name = str(raw.get("nome") or "").strip()
        if not bling_id or not sku or not name:
            raise ValueError("product is missing id, codigo or nome")

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
                product = existing
                product.bling_id = bling_id
                action = "updated"
            else:
                product = Product(bling_id=bling_id, sku=sku, name=name)
                action = "created"

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
        stock = raw.get("estoque")
        if isinstance(stock, dict) and stock.get("saldo") is not None:
            product.stock_quantity = int(stock["saldo"])
        elif isinstance(stock, list) and stock:
            saldo = stock[0].get("saldo") if isinstance(stock[0], dict) else None
            if saldo is not None:
                product.stock_quantity = int(saldo)
        situation = str(raw.get("situacao") or "A").upper()
        product.active = situation in ("A", "ATIVO", "1", "S")
        product.last_synced_at = self._now()
        await self._data_repo.upsert_product(product)
        return action

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

    async def _upsert_order(self, raw: dict[str, Any]) -> str:
        from uuid import uuid4

        external_id = str(raw.get("id"))
        if not external_id:
            raise ValueError("order is missing id")

        customer = raw.get("contato") or {}
        order_number = str(raw.get("numero") or external_id)
        order = await self._data_repo.find_order_by_external_id(external_id)
        if order is None:
            order = Order(
                id=uuid4(),
                external_id=external_id,
                marketplace="bling",
                order_number=order_number,
                customer_name=str(customer.get("nome") or "Cliente"),
                ordered_at=self._now(),
            )
            self._data_repo.session.add(order)
            await self._data_repo.session.flush()
            action = "created"
        else:
            action = "updated"

        order.customer_document = self._clean_text(customer.get("numeroDocumento"))
        order.customer_email = self._clean_text(customer.get("email"))
        order.customer_phone = self._clean_text(customer.get("celular"))
        order.status = self._order_status(raw)
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

        items = raw.get("itens") or []
        if isinstance(items, list):
            for item in items:
                if not isinstance(item, dict):
                    continue
                await self._upsert_order_item(order, item)
        await self._data_repo.session.flush()
        return action

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
            raise ValueError(f"order item product not found for sku={sku or bling_id}")
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

    @staticmethod
    def _order_status(raw: dict[str, Any]) -> str:
        situation = raw.get("situacao") or {}
        if isinstance(situation, dict):
            desc = str(situation.get("descricao") or "").lower()
            if "conclu" in desc or "finaliz" in desc:
                return "completed"
            if "cancel" in desc:
                return "cancelled"
            return "pending"
        return "pending"

    async def _record_error(self, log: SyncLog, entity: str, raw: dict[str, Any]) -> None:
        error = SyncError(
            sync_log_id=log.id,
            entity=entity,
            external_id=str(raw.get("id") or "")[:50],
            error_type="item_sync_error",
            error_message="Failed to sync item",
            raw_data=raw,
        )
        self._data_repo.session.add(error)
        await self._data_repo.session.flush()

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
