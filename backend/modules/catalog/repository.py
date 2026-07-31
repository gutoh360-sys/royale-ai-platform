from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models.category import Category
from backend.database.models.product import Product
from backend.modules.catalog.ports import ICategoryRepository, IProductRepository
from backend.modules.financial.ports import IFinancialRepository
from backend.modules.pricing.ports import IPriceRepository
from backend.modules.stock.ports import IStockRepository


class PostgresProductRepository(
    IProductRepository,
    IStockRepository,
    IPriceRepository,
    IFinancialRepository,
):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # IProductRepository

    async def find_all(self) -> list[Product]:
        stmt = select(Product)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_id(self, product_id: str) -> Product | None:
        stmt = select(Product).where(Product.id == UUID(product_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_sku(self, sku: str) -> Product | None:
        stmt = select(Product).where(Product.sku == sku)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def save(self, product: Product) -> Product:
        self._session.add(product)
        await self._session.flush()
        await self._session.refresh(product)
        return product

    async def delete(self, product_id: str) -> None:
        product = await self.find_by_id(product_id)
        if product is not None:
            await self._session.delete(product)
            await self._session.flush()

    # IStockRepository

    async def update_quantity(self, sku: str, quantity: int) -> None:
        product = await self.find_by_sku(sku)
        if product is not None:
            product.stock_quantity = quantity
            await self._session.flush()

    async def reserve(self, sku: str, quantity: int) -> None:
        product = await self.find_by_sku(sku)
        if product is not None:
            product.stock_quantity -= quantity
            await self._session.flush()

    # IPriceRepository

    async def find_by_product_id(self, product_id: str) -> Product | None:
        stmt = select(Product).where(Product.id == UUID(product_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    # IFinancialRepository

    async def find_costs_by_product_id(self, product_id: str) -> Product | None:
        stmt = select(Product).where(Product.id == UUID(product_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_cost(self, cost: Product) -> Product:
        self._session.add(cost)
        await self._session.flush()
        await self._session.refresh(cost)
        return cost


class PostgresCategoryRepository(ICategoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_all(self) -> list[Category]:
        stmt = select(Category)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_id(self, category_id: str) -> Category | None:
        stmt = select(Category).where(Category.id == UUID(category_id))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def save(self, category: Category) -> Category:
        self._session.add(category)
        await self._session.flush()
        await self._session.refresh(category)
        return category

    async def delete(self, category_id: str) -> None:
        stmt = delete(Category).where(Category.id == UUID(category_id))
        await self._session.execute(stmt)
        await self._session.flush()
