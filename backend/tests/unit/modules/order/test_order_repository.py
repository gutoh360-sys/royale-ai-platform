from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

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


async def _seed_product(db_session: AsyncSession) -> Product:
    category = Category(id=uuid4(), bling_id="BL-C-001", name="Eletrônicos", active=True)
    db_session.add(category)
    await db_session.flush()
    product = Product(
        id=uuid4(),
        sku="SKU-DEL-001",
        bling_id="BL-P-DEL-001",
        name="Produto",
        category_id=category.id,
        price=Decimal("10.00"),
    )
    db_session.add(product)
    await db_session.flush()
    return product


async def _seed_order_with_items(
    db_session: AsyncSession,
    product: Product,
    items_count: int,
    external_id: str = "EXT-001",
    order_number: str = "12345",
) -> Order:
    repo = PostgresOrderRepository(db_session)
    order = _make_order(
        external_id=external_id,
        order_number=order_number,
        total_amount=Decimal(f"{items_count * 10}.00"),
    )
    order.items = [
        OrderItem(
            product_id=product.id,
            sku=f"SKU-{external_id}-{i}",
            product_name="Produto",
            quantity=1,
            unit_price=Decimal("10.00"),
            total_price=Decimal("10.00"),
        )
        for i in range(items_count)
    ]
    return await repo.save(order)


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


async def test_save_persists_order_with_items(db_session: AsyncSession) -> None:
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
    order.items = [
        OrderItem(
            product_id=product.id,
            sku="SKU-001",
            product_name="Produto",
            quantity=2,
            unit_price=Decimal("10.00"),
            total_price=Decimal("20.00"),
        )
    ]

    saved = await repo.save(order)

    assert saved.id == order.id
    assert len(saved.items) == 1
    assert saved.items[0].sku == "SKU-001"
    assert saved.items[0].quantity == 2
    assert saved.items[0].unit_price == Decimal("10.00")
    assert saved.items[0].total_price == Decimal("20.00")
    assert saved.items[0].product_id == product.id
    assert saved.items[0].created_at is not None


async def test_save_rolls_back_when_item_product_missing(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    order = _make_order(total_amount=Decimal("20.00"))
    order.items = [
        OrderItem(
            product_id=uuid4(),
            sku="SKU-001",
            product_name="Produto",
            quantity=1,
            unit_price=Decimal("10.00"),
            total_price=Decimal("10.00"),
        )
    ]

    with pytest.raises(IntegrityError):
        await repo.save(order)

    await db_session.rollback()
    remaining = await db_session.execute(select(Order))
    assert remaining.scalars().all() == []


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


async def test_delete_order_without_items(
    db_session: AsyncSession,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = PostgresOrderRepository(db_session)
    order = await repo.save(_make_order())
    await db_session.commit()

    deleted = await repo.delete(str(order.id))

    assert deleted is True
    await db_session.commit()
    async with session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(Order))
    assert count == 0


async def test_delete_order_with_single_item(
    db_session: AsyncSession,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = PostgresOrderRepository(db_session)
    product = await _seed_product(db_session)
    order = await _seed_order_with_items(db_session, product, 1)
    await db_session.commit()

    deleted = await repo.delete(str(order.id))

    assert deleted is True
    await db_session.commit()
    async with session_factory() as session:
        order_count = await session.scalar(select(func.count()).select_from(Order))
        item_count = await session.scalar(select(func.count()).select_from(OrderItem))
    assert order_count == 0
    assert item_count == 0


async def test_delete_order_with_multiple_items(
    db_session: AsyncSession,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = PostgresOrderRepository(db_session)
    product = await _seed_product(db_session)
    order = await _seed_order_with_items(db_session, product, 3)
    await db_session.commit()

    deleted = await repo.delete(str(order.id))

    assert deleted is True
    await db_session.commit()
    async with session_factory() as session:
        item_count = await session.scalar(select(func.count()).select_from(OrderItem))
    assert item_count == 0


async def test_delete_missing_order_returns_false(
    db_session: AsyncSession,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = PostgresOrderRepository(db_session)

    deleted = await repo.delete(str(uuid4()))

    assert deleted is False
    await db_session.commit()
    async with session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(Order))
    assert count == 0


async def test_delete_does_not_affect_other_orders(
    db_session: AsyncSession,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    repo = PostgresOrderRepository(db_session)
    product = await _seed_product(db_session)
    order_a = await _seed_order_with_items(
        db_session, product, 1, external_id="EXT-A", order_number="1"
    )
    order_b = await _seed_order_with_items(
        db_session, product, 2, external_id="EXT-B", order_number="2"
    )
    await db_session.commit()

    deleted = await repo.delete(str(order_a.id))

    assert deleted is True
    await db_session.commit()
    async with session_factory() as session:
        remaining_orders = (await session.scalars(select(Order))).all()
        remaining_items = (await session.scalars(select(OrderItem))).all()
    assert len(remaining_orders) == 1
    assert remaining_orders[0].external_id == "EXT-B"
    assert len(remaining_items) == 2
    assert all(str(item.order_id) == str(order_b.id) for item in remaining_items)


async def test_delete_flushes_within_transaction(db_session: AsyncSession) -> None:
    repo = PostgresOrderRepository(db_session)
    product = await _seed_product(db_session)
    order = await _seed_order_with_items(db_session, product, 1)

    deleted = await repo.delete(str(order.id))

    assert deleted is True
    order_count = await db_session.scalar(select(func.count()).select_from(Order))
    item_count = await db_session.scalar(select(func.count()).select_from(OrderItem))
    assert order_count == 0
    assert item_count == 0
