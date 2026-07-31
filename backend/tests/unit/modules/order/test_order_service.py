from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from backend.database.models.order import Order, OrderItem
from backend.modules.order.ports import IOrderRepository
from backend.modules.order.service import OrderService


class InMemoryOrderRepository(IOrderRepository):
    def __init__(self) -> None:
        self._orders: dict[Any, Order] = {}
        self.find_all_calls: list[str | None] = []
        self.find_by_id_calls: list[str] = []
        self.save_calls: list[Order] = []

    async def find_all(self, status: str | None = None) -> list[Order]:
        self.find_all_calls.append(status)
        orders = list(self._orders.values())
        if status is not None:
            orders = [o for o in orders if o.status == status]
        return orders

    async def find_by_id(self, order_id: str) -> Order | None:
        self.find_by_id_calls.append(order_id)
        for order in self._orders.values():
            if str(order.id) == order_id:
                return order
        return None

    async def find_by_external_id(self, external_id: str, marketplace: str) -> Order | None:
        for order in self._orders.values():
            if order.external_id == external_id and order.marketplace == marketplace:
                return order
        return None

    async def save(self, order: Order) -> Order:
        self.save_calls.append(order)
        self._orders[order.id] = order
        return order

    async def update_status(self, order_id: str, status: str) -> None:
        order = await self.find_by_id(order_id)
        if order is not None:
            order.status = status


def _make_order(**overrides: Any) -> Order:
    values: dict[str, Any] = {
        "id": uuid4(),
        "external_id": "EXT-001",
        "marketplace": "bling",
        "order_number": "12345",
        "customer_name": "Cliente Teste",
        "status": "pending",
        "total_amount": 100,
        "ordered_at": datetime.now(),
    }
    values.update(overrides)
    return Order(**values)


async def test_list_orders_without_filter() -> None:
    repo = InMemoryOrderRepository()
    repo._orders = {
        uuid4(): _make_order(external_id="EXT-001"),
        uuid4(): _make_order(external_id="EXT-002"),
    }
    service = OrderService(repo)

    orders = await service.list_orders()

    assert len(orders) == 2
    assert repo.find_all_calls == [None]


async def test_list_orders_with_status() -> None:
    repo = InMemoryOrderRepository()
    repo._orders = {
        uuid4(): _make_order(external_id="EXT-001", status="pending"),
        uuid4(): _make_order(external_id="EXT-002", status="completed"),
    }
    service = OrderService(repo)

    orders = await service.list_orders(status="completed")

    assert len(orders) == 1
    assert orders[0].external_id == "EXT-002"
    assert repo.find_all_calls == ["completed"]


async def test_update_order_single_field() -> None:
    repo = InMemoryOrderRepository()
    order_id = uuid4()
    repo._orders = {order_id: _make_order(id=order_id)}
    service = OrderService(repo)

    updated = await service.update_order(str(order_id), {"customer_name": "Novo Cliente"})

    assert updated is not None
    assert updated.customer_name == "Novo Cliente"
    assert updated.external_id == "EXT-001"


async def test_update_order_multiple_fields() -> None:
    repo = InMemoryOrderRepository()
    order_id = uuid4()
    repo._orders = {order_id: _make_order(id=order_id)}
    service = OrderService(repo)

    updated = await service.update_order(
        str(order_id), {"customer_name": "Novo Cliente", "status": "completed"}
    )

    assert updated is not None
    assert updated.customer_name == "Novo Cliente"
    assert updated.status == "completed"
    assert updated.external_id == "EXT-001"


async def test_update_order_partial_preserves_absent_fields() -> None:
    repo = InMemoryOrderRepository()
    order_id = uuid4()
    repo._orders = {order_id: _make_order(id=order_id, status="pending")}
    service = OrderService(repo)

    updated = await service.update_order(str(order_id), {"notes": "Obs"})

    assert updated is not None
    assert updated.notes == "Obs"
    assert updated.status == "pending"
    assert updated.customer_name == "Cliente Teste"


async def test_update_order_missing_returns_none() -> None:
    repo = InMemoryOrderRepository()
    service = OrderService(repo)

    updated = await service.update_order(str(uuid4()), {"customer_name": "X"})

    assert updated is None
    assert repo.save_calls == []


async def test_update_order_does_not_modify_items() -> None:
    repo = InMemoryOrderRepository()
    order_id = uuid4()
    order = _make_order(id=order_id)
    item = OrderItem(
        id=uuid4(),
        order_id=order_id,
        product_id=uuid4(),
        sku="SKU-001",
        product_name="Produto Teste",
        quantity=2,
        unit_price=Decimal("10.00"),
        total_price=Decimal("20.00"),
        cost=None,
        created_at=datetime.now(UTC),
    )
    order.items = [item]
    repo._orders = {order_id: order}
    service = OrderService(repo)

    updated = await service.update_order(str(order_id), {"customer_name": "Novo"})

    assert updated is not None
    assert len(updated.items) == 1
    assert updated.items[0].sku == "SKU-001"
    assert updated.items[0].quantity == 2
    assert updated.customer_name == "Novo"


async def test_update_order_calls_repository() -> None:
    repo = InMemoryOrderRepository()
    order_id = uuid4()
    repo._orders = {order_id: _make_order(id=order_id)}
    service = OrderService(repo)

    updated = await service.update_order(str(order_id), {"status": "completed"})

    assert repo.find_by_id_calls == [str(order_id)]
    assert len(repo.save_calls) == 1
    assert updated is not None
    assert updated.status == "completed"
