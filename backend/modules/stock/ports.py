from abc import ABC, abstractmethod
from typing import Any


class IStockRepository(ABC):
    @abstractmethod
    async def find_by_sku(self, sku: str) -> Any: ...

    @abstractmethod
    async def update_quantity(self, sku: str, quantity: int) -> None: ...

    @abstractmethod
    async def reserve(self, sku: str, quantity: int) -> None: ...
