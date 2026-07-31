from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from backend.database.models.category import Category
from backend.database.models.product import Product
from backend.modules.catalog.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)


def test_category_create_valid() -> None:
    category = CategoryCreate.model_validate({"bling_id": "B001", "name": "Eletrônicos"})

    assert category.bling_id == "B001"
    assert category.name == "Eletrônicos"
    assert category.parent_id is None
    assert category.path is None
    assert category.active is True


def test_category_create_rejects_missing_required() -> None:
    with pytest.raises(ValidationError):
        CategoryCreate.model_validate({"bling_id": "B001"})


def test_category_update_partial() -> None:
    category = CategoryUpdate.model_validate({"name": "Nova categoria"})

    assert category.name == "Nova categoria"
    assert category.bling_id is None
    assert category.active is None


def test_category_update_rejects_long_name() -> None:
    with pytest.raises(ValidationError):
        CategoryUpdate.model_validate({"name": "x" * 201})


def test_category_response_from_attributes() -> None:
    category_id = uuid4()
    now = datetime.now()
    category = Category(
        id=category_id,
        bling_id="B001",
        name="Eletrônicos",
        parent_id=None,
        path=None,
        active=True,
        created_at=now,
        updated_at=now,
    )

    schema = CategoryResponse.model_validate(category)

    assert schema.id == category_id
    assert schema.bling_id == "B001"
    assert schema.name == "Eletrônicos"
    assert schema.active is True
    assert schema.created_at == now


def test_product_create_valid() -> None:
    category_id = uuid4()
    product = ProductCreate.model_validate(
        {
            "sku": "SKU-001",
            "bling_id": "P001",
            "name": "Produto Teste",
            "category_id": category_id,
            "price": Decimal("19.99"),
        }
    )

    assert product.sku == "SKU-001"
    assert product.price == Decimal("19.99")
    assert product.category_id == category_id
    assert product.stock_quantity == 0
    assert product.active is True


def test_product_create_rejects_negative_price() -> None:
    with pytest.raises(ValidationError):
        ProductCreate.model_validate(
            {
                "sku": "SKU-001",
                "bling_id": "P001",
                "name": "Produto Teste",
                "category_id": uuid4(),
                "price": Decimal("-1.00"),
            }
        )


def test_product_create_rejects_negative_stock() -> None:
    with pytest.raises(ValidationError):
        ProductCreate.model_validate(
            {
                "sku": "SKU-001",
                "bling_id": "P001",
                "name": "Produto Teste",
                "category_id": uuid4(),
                "price": Decimal("10.00"),
                "stock_quantity": -1,
            }
        )


def test_product_update_partial() -> None:
    product = ProductUpdate.model_validate({"name": "Nome atualizado"})

    assert product.name == "Nome atualizado"
    assert product.price is None
    assert product.stock_quantity is None


def test_product_response_from_attributes() -> None:
    product_id = uuid4()
    category_id = uuid4()
    now = datetime.now()
    product = Product(
        id=product_id,
        sku="SKU-001",
        bling_id="P001",
        ean=None,
        name="Produto Teste",
        description=None,
        brand=None,
        category_id=category_id,
        price=Decimal("19.99"),
        cost=Decimal("10.00"),
        stock_quantity=5,
        active=True,
        attributes=None,
        created_at=now,
        updated_at=now,
        last_synced_at=None,
    )

    schema = ProductResponse.model_validate(product)

    assert schema.id == product_id
    assert schema.category_id == category_id
    assert schema.price == Decimal("19.99")
    assert schema.cost == Decimal("10.00")
    assert schema.stock_quantity == 5
    assert schema.created_at == now


def test_product_response_preserves_uuid_and_decimal_types() -> None:
    product_id = uuid4()
    now = datetime.now()
    product = Product(
        id=product_id,
        sku="SKU-001",
        bling_id="P001",
        ean=None,
        name="Produto Teste",
        description=None,
        brand=None,
        category_id=uuid4(),
        price=Decimal("19.99"),
        cost=None,
        stock_quantity=0,
        active=True,
        attributes=None,
        created_at=now,
        updated_at=now,
        last_synced_at=None,
    )

    schema = ProductResponse.model_validate(product)

    assert isinstance(schema.id, UUID)
    assert isinstance(schema.price, Decimal)
