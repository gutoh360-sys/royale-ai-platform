from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.category import Category
from backend.database.models.order import Order, OrderItem
from backend.database.models.product import Product
from backend.modules.order.repository import PostgresOrderRepository


def _make_order(**overrides: object) -> Order:
    values: dict[str, object] = {
        "external_id": "EXT-001",
        "marketplace": "bling",
        "order_number": "12345",
        "customer_name": "Cliente Teste",
        "status": "pending",
        "total_amount": Decimal("100.00"),
        "ordered_at": datetime.now(UTC),
    }
    values.update(overrides)
    return Order(**values)


async def test_find_all_returns_orders(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    db_session.add_all(
        [
            _make_order(external_id="EXT-001", order_number="1"),
            _make_order(external_id="EXT-002", order_number="2"),
        ]
    )
    await db_session.flush()

    orders = await repo.find_all()

    assert {o.external_id for o in orders} == {"EXT-001", "EXT-002"}


async def test_find_all_empty(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)

    orders = await repo.find_all()

    assert orders == []


async def test_find_all_filters_by_status(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    db_session.add_all(
        [
            _make_order(external_id="EXT-001", status="pending"),
            _make_order(external_id="EXT-002", status="completed"),
            _make_order(external_id="EXT-003", status="completed"),
        ]
    )
    await db_session.flush()

    orders = await repo.find_all(status="completed")

    assert {o.external_id for o in orders} == {"EXT-002", "EXT-003"}


async def test_find_all_filter_without_results(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    db_session.add(_make_order(external_id="EXT-001", status="pending"))
    await db_session.flush()

    orders = await repo.find_all(status="cancelled")

    assert orders == []


async def test_find_all_orders_deterministic_ordering(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    base = datetime.now(UTC)
    db_session.add_all(
        [
            _make_order(external_id="EXT-001", created_at=base - timedelta(seconds=5)),
            _make_order(external_id="EXT-002", created_at=base),
        ]
    )
    await db_session.flush()

    orders = await repo.find_all()

    assert [o.external_id for o in orders] == ["EXT-001", "EXT-002"]


async def test_save_persists_order(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    order = _make_order()

    saved = await repo.save(order)

    assert saved.id is not None
    assert saved.external_id == "EXT-001"
    assert saved.status == "pending"
    assert isinstance(saved.total_amount, Decimal)


async def test_update_header_preserves_fields(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    order = _make_order()
    db_session.add(order)
    await db_session.flush()

    order.customer_name = "Novo Cliente"
    order.notes = "Observação"
    saved = await repo.save(order)

    assert saved.customer_name == "Novo Cliente"
    assert saved.notes == "Observação"
    assert saved.external_id == "EXT-001"
    assert saved.total_amount == Decimal("100.00")


async def test_update_header_preserves_order_items(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    category = Category(id=uuid4(), bling_id="C001", name="Eletrônicos", active=True)
    db_session.add(category)
    await db_session.flush()
    product = Product(
        id=uuid4(),
        sku="SKU-001",
        bling_id="P001",
        name="Produto",
        category_id=category.id,
        price=Decimal("10.00"),
    )
    db_session.add(product)
    await db_session.flush()
    order = _make_order(total_amount=Decimal("20.00"))
    db_session.add(order)
    await db_session.flush()
    db_session.add(
        OrderItem(
            id=uuid4(),
            order_id=order.id,
            product_id=product.id,
            sku="SKU-001",
            product_name="Produto",
            quantity=2,
            unit_price=Decimal("10.00"),
            total_price=Decimal("20.00"),
            cost=None,
            created_at=datetime.now(UTC),
        )
    )
    await db_session.flush()

    order.customer_name = "Nome Atualizado"
    saved = await repo.save(order)

    assert saved.customer_name == "Nome Atualizado"
    assert len(saved.items) == 1
    assert saved.items[0].sku == "SKU-001"
    assert saved.items[0].quantity == 2
    assert saved.items[0].unit_price == Decimal("10.00")
    assert saved.items[0].total_price == Decimal("20.00")


async def test_preserves_decimal_uuid_datetime_types(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    ordered_at = datetime(2026, 7, 31, 10, 30, tzinfo=UTC)
    order_id = uuid4()
    db_session.add(
        _make_order(
            id=order_id,
            external_id="EXT-001",
            total_amount=Decimal("123.45"),
            ordered_at=ordered_at,
        )
    )
    await db_session.flush()

    order = await repo.find_by_id(str(order_id))

    assert order is not None
    assert order.id == order_id
    assert isinstance(order.id, type(order_id))
    assert order.total_amount == Decimal("123.45")
    assert isinstance(order.total_amount, Decimal)
    assert order.ordered_at == ordered_at
    assert order.marketplace == "bling"
