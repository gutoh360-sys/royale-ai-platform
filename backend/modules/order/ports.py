from abc import ABC, abstractmethod

from backend.database.models.order import Order


class IOrderRepository(ABC):
    @abstractmethod
    async def find_all(self, status: str | None = None) -> list[Order]: ...

    @abstractmethod
    async def find_by_id(self, order_id: str) -> Order | None: ...

    @abstractmethod
    async def find_by_external_id(self, external_id: str, marketplace: str) -> Order | None: ...

    @abstractmethod
    async def save(self, order: Order) -> Order: ...

    @abstractmethod
    async def update_status(self, order_id: str, status: str) -> None: ...
