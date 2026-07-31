from typing import Any

from backend.database.models.category import Category
from backend.modules.catalog.ports import ICategoryRepository, IProductRepository


class ProductService:
    def __init__(self, product_repo: IProductRepository) -> None:
        self._product_repo = product_repo

    async def list_products(self) -> list[Any]:
        return await self._product_repo.find_all()

    async def get_product(self, product_id: str) -> Any | None:
        return await self._product_repo.find_by_id(product_id)

    async def get_product_by_sku(self, sku: str) -> Any | None:
        return await self._product_repo.find_by_sku(sku)

    async def create_product(self, product: Any) -> Any:
        return await self._product_repo.save(product)

    async def update_product(self, product_id: str, data: dict[str, Any]) -> Any | None:
        product = await self._product_repo.find_by_id(product_id)
        if product is None:
            return None
        for key, value in data.items():
            setattr(product, key, value)
        return await self._product_repo.save(product)

    async def delete_product(self, product_id: str) -> None:
        await self._product_repo.delete(product_id)


class CategoryService:
    def __init__(self, category_repo: ICategoryRepository) -> None:
        self._category_repo = category_repo

    async def list_categories(self) -> list[Category]:
        return await self._category_repo.find_all()

    async def get_category(self, category_id: str) -> Category | None:
        return await self._category_repo.find_by_id(category_id)

    async def create_category(self, category: Category) -> Category:
        return await self._category_repo.save(category)

    async def update_category(self, category_id: str, data: dict[str, Any]) -> Category | None:
        category = await self._category_repo.find_by_id(category_id)
        if category is None:
            return None
        for key, value in data.items():
            setattr(category, key, value)
        return await self._category_repo.save(category)

    async def delete_category(self, category_id: str) -> None:
        await self._category_repo.delete(category_id)
