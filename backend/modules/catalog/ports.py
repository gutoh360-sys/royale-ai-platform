from abc import ABC, abstractmethod
from typing import Any

from backend.database.models.category import Category


class IProductRepository(ABC):
    @abstractmethod
    async def find_all(self) -> list[Any]: ...

    @abstractmethod
    async def find_by_id(self, product_id: str) -> Any: ...

    @abstractmethod
    async def find_by_sku(self, sku: str) -> Any: ...

    @abstractmethod
    async def save(self, product: Any) -> Any: ...

    @abstractmethod
    async def delete(self, product_id: str) -> None: ...


class ICategoryRepository(ABC):
    @abstractmethod
    async def find_all(self) -> list[Category]: ...

    @abstractmethod
    async def find_by_id(self, category_id: str) -> Category | None: ...

    @abstractmethod
    async def save(self, category: Category) -> Category: ...

    @abstractmethod
    async def delete(self, category_id: str) -> None: ...
