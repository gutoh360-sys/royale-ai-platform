from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from backend.database.models.order import Order, OrderItem
from backend.modules.order.schemas import (
    OrderCreate,
    OrderItemCreate,
    OrderItemResponse,
    OrderResponse,
    OrderUpdate,
)


def test_order_item_create_valid() -> None:
    item = OrderItemCreate.model_validate(
        {
            "product_id": uuid4(),
            "sku": "SKU-001",
            "product_name": "Produto Teste",
            "quantity": 2,
            "unit_price": Decimal("10.00"),
            "total_price": Decimal("20.00"),
        }
    )

    assert item.product_name == "Produto Teste"
    assert item.quantity == 2
    assert item.unit_price == Decimal("10.00")
    assert item.total_price == Decimal("20.00")
    assert item.cost is None


def test_order_item_create_rejects_zero_quantity() -> None:
    with pytest.raises(ValidationError):
        OrderItemCreate.model_validate(
            {
                "product_id": uuid4(),
                "sku": "SKU-001",
                "product_name": "Produto Teste",
                "quantity": 0,
                "unit_price": Decimal("10.00"),
                "total_price": Decimal("0.00"),
            }
        )


def test_order_item_create_rejects_negative_unit_price() -> None:
    with pytest.raises(ValidationError):
        OrderItemCreate.model_validate(
            {
                "product_id": uuid4(),
                "sku": "SKU-001",
                "product_name": "Produto Teste",
                "quantity": 1,
                "unit_price": Decimal("-1.00"),
                "total_price": Decimal("-1.00"),
            }
        )


def test_order_item_response_from_attributes() -> None:
    item_id = uuid4()
    order_id = uuid4()
    product_id = uuid4()
    now = datetime.now()
    item = OrderItem(
        id=item_id,
        order_id=order_id,
        product_id=product_id,
        sku="SKU-001",
        product_name="Produto Teste",
        quantity=2,
        unit_price=Decimal("10.00"),
        total_price=Decimal("20.00"),
        cost=Decimal("8.00"),
        created_at=now,
    )

    schema = OrderItemResponse.model_validate(item)

    assert schema.id == item_id
    assert schema.order_id == order_id
    assert schema.product_id == product_id
    assert schema.quantity == 2
    assert schema.unit_price == Decimal("10.00")
    assert schema.total_price == Decimal("20.00")


def test_order_create_valid() -> None:
    order = OrderCreate.model_validate(
        {
            "external_id": "EXT-001",
            "order_number": "12345",
            "customer_name": "Cliente Teste",
            "total_amount": Decimal("100.00"),
            "ordered_at": datetime.now(),
        }
    )

    assert order.marketplace == "bling"
    assert order.status == "pending"
    assert order.total_amount == Decimal("100.00")


def test_order_create_rejects_negative_total() -> None:
    with pytest.raises(ValidationError):
        OrderCreate.model_validate(
            {
                "external_id": "EXT-001",
                "order_number": "12345",
                "customer_name": "Cliente Teste",
                "total_amount": Decimal("-100.00"),
                "ordered_at": datetime.now(),
            }
        )


def test_order_update_partial() -> None:
    order = OrderUpdate.model_validate({"status": "completed", "customer_name": "Nome atualizado"})

    assert order.status == "completed"
    assert order.customer_name == "Nome atualizado"
    assert order.total_amount is None
    assert order.external_id is None


def test_order_update_excludes_server_managed_fields() -> None:
    fields = set(OrderUpdate.model_fields.keys())

    assert "id" not in fields
    assert "created_at" not in fields
    assert "updated_at" not in fields
    assert "last_synced_at" not in fields


def test_order_response_with_items_from_attributes() -> None:
    order_id = uuid4()
    product_id = uuid4()
    now = datetime.now()
    item = OrderItem(
        id=uuid4(),
        order_id=order_id,
        product_id=product_id,
        sku="SKU-001",
        product_name="Produto Teste",
        quantity=2,
        unit_price=Decimal("10.00"),
        total_price=Decimal("20.00"),
        cost=None,
        created_at=now,
    )
    order = Order(
        id=order_id,
        external_id="EXT-001",
        marketplace="bling",
        order_number="12345",
        customer_name="Cliente Teste",
        customer_document=None,
        customer_email=None,
        customer_phone=None,
        status="pending",
        total_amount=Decimal("100.00"),
        shipping_amount=None,
        discount_amount=None,
        payment_method=None,
        notes=None,
        ordered_at=now,
        created_at=now,
        updated_at=now,
        last_synced_at=None,
    )
    order.items = [item]

    schema = OrderResponse.model_validate(order)

    assert schema.id == order_id
    assert schema.total_amount == Decimal("100.00")
    assert len(schema.items) == 1
    assert schema.items[0].sku == "SKU-001"
    assert isinstance(schema.items[0].id, UUID)
    assert isinstance(schema.items[0].unit_price, Decimal)


def test_order_response_serializes_without_recursion() -> None:
    order_id = uuid4()
    now = datetime.now()
    item = OrderItem(
        id=uuid4(),
        order_id=order_id,
        product_id=uuid4(),
        sku="SKU-001",
        product_name="Produto Teste",
        quantity=1,
        unit_price=Decimal("10.00"),
        total_price=Decimal("10.00"),
        cost=None,
        created_at=now,
    )
    order = Order(
        id=order_id,
        external_id="EXT-001",
        marketplace="bling",
        order_number="12345",
        customer_name="Cliente Teste",
        customer_document=None,
        customer_email=None,
        customer_phone=None,
        status="pending",
        total_amount=Decimal("10.00"),
        shipping_amount=None,
        discount_amount=None,
        payment_method=None,
        notes=None,
        ordered_at=now,
        created_at=now,
        updated_at=now,
        last_synced_at=None,
    )
    order.items = [item]

    data = OrderResponse.model_validate(order).model_dump(mode="json")

    assert data["items"][0]["order_id"] == str(order_id)
    assert "order" not in data["items"][0]
    assert "product" not in data["items"][0]
