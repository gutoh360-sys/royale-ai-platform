from typing import Any
from uuid import uuid4

from backend.database.models.category import Category
from backend.modules.catalog.ports import ICategoryRepository
from backend.modules.catalog.service import CategoryService


class InMemoryCategoryRepository(ICategoryRepository):
    def __init__(self) -> None:
        self._categories: dict[Any, Category] = {}
        self.deleted: list[str] = []

    async def find_all(self) -> list[Category]:
        return list(self._categories.values())

    async def find_by_id(self, category_id: str) -> Category | None:
        for category in self._categories.values():
            if str(category.id) == category_id:
                return category
        return None

    async def save(self, category: Category) -> Category:
        self._categories[category.id] = category
        return category

    async def delete(self, category_id: str) -> None:
        for key in list(self._categories):
            if str(key) == category_id:
                del self._categories[key]
                self.deleted.append(category_id)
                return


async def test_list_categories() -> None:
    repo = InMemoryCategoryRepository()
    first_id = uuid4()
    second_id = uuid4()
    repo._categories = {
        first_id: Category(id=first_id, bling_id="B001", name="Eletrônicos", active=True),
        second_id: Category(id=second_id, bling_id="B002", name="Moda", active=True),
    }
    service = CategoryService(repo)

    categories = await service.list_categories()

    assert len(categories) == 2


async def test_update_category_updates_fields() -> None:
    repo = InMemoryCategoryRepository()
    category_id = uuid4()
    category = Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True)
    repo._categories = {category_id: category}
    service = CategoryService(repo)

    updated = await service.update_category(str(category_id), {"name": "Tecnologia"})

    assert updated is not None
    assert updated.name == "Tecnologia"
    assert updated.bling_id == "B001"
    assert updated.active is True


async def test_update_category_partial_preserves_other_fields() -> None:
    repo = InMemoryCategoryRepository()
    category_id = uuid4()
    category = Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True)
    repo._categories = {category_id: category}
    service = CategoryService(repo)

    updated = await service.update_category(str(category_id), {"active": False})

    assert updated is not None
    assert updated.active is False
    assert updated.name == "Eletrônicos"
    assert updated.bling_id == "B001"


async def test_update_category_returns_none_when_missing() -> None:
    repo = InMemoryCategoryRepository()
    service = CategoryService(repo)

    updated = await service.update_category(str(uuid4()), {"name": "X"})

    assert updated is None


async def test_delete_category() -> None:
    repo = InMemoryCategoryRepository()
    category_id = uuid4()
    repo._categories = {
        category_id: Category(id=category_id, bling_id="B001", name="Eletrônicos", active=True)
    }
    service = CategoryService(repo)

    await service.delete_category(str(category_id))

    assert repo.deleted == [str(category_id)]
