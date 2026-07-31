from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.category import Category
from backend.database.models.product import Product
from backend.modules.catalog.repository import PostgresCategoryRepository


async def test_find_all_returns_categories(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    db_session.add_all(
        [
            Category(id=uuid4(), bling_id="B001", name="Eletrônicos", active=True),
            Category(id=uuid4(), bling_id="B002", name="Moda", active=True),
        ]
    )
    await db_session.flush()

    categories = await repo.find_all()

    assert {c.bling_id for c in categories} == {"B001", "B002"}


async def test_find_all_empty(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)

    categories = await repo.find_all()

    assert categories == []


async def test_find_by_id_returns_category(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    category_id = uuid4()
    db_session.add(Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True))
    await db_session.flush()

    category = await repo.find_by_id(str(category_id))

    assert category is not None
    assert category.id == category_id
    assert category.name == "Eletrônicos"


async def test_find_by_id_returns_none_when_missing(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)

    category = await repo.find_by_id(str(uuid4()))

    assert category is None


async def test_save_persists_category(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    category = Category(bling_id="B001", name="Eletrônicos", active=True)

    saved = await repo.save(category)

    assert saved.id is not None
    assert saved.bling_id == "B001"


async def test_delete_removes_category(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    category_id = uuid4()
    db_session.add(Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True))
    await db_session.flush()

    await repo.delete(str(category_id))

    assert await repo.find_by_id(str(category_id)) is None


async def test_delete_sets_children_parent_to_null(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    parent_id = uuid4()
    db_session.add(Category(id=parent_id, bling_id="PAR", name="Pai", active=True))
    db_session.add(
        Category(id=uuid4(), bling_id="CHI", name="Filho", parent_id=parent_id, active=True)
    )
    await db_session.flush()

    await repo.delete(str(parent_id))

    remaining = await repo.find_all()
    assert len(remaining) == 1
    assert remaining[0].bling_id == "CHI"
    assert remaining[0].parent_id is None


async def test_delete_raises_when_product_references_category(db_session: AsyncSession) -> None:
    repo = PostgresCategoryRepository(db_session)
    category_id = uuid4()
    db_session.add(Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True))
    await db_session.flush()
    db_session.add(
        Product(
            id=uuid4(),
            sku="SKU-001",
            bling_id="P001",
            name="Produto",
            category_id=category_id,
            price=10,
        )
    )
    await db_session.flush()

    with pytest.raises(IntegrityError):
        await repo.delete(str(category_id))
