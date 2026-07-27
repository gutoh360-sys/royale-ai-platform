from abc import ABC, abstractmethod
from typing import Any


class IOrderRepository(ABC):
    @abstractmethod
    async def find_by_id(self, order_id: str) -> Any: ...

    @abstractmethod
    async def find_by_external_id(self, external_id: str, marketplace: str) -> Any: ...

    @abstractmethod
    async def save(self, order: Any) -> Any: ...

    @abstractmethod
    async def update_status(self, order_id: str, status: str) -> None: ...
