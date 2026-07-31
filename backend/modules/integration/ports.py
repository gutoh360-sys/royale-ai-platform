from abc import ABC, abstractmethod

from backend.database.models.connection import IntegrationConnection


class IIntegrationOrchestrator(ABC):
    @abstractmethod
    async def sync_all_orders(self) -> None: ...

    @abstractmethod
    async def sync_all_products(self) -> None: ...

    @abstractmethod
    async def sync_stock(self, marketplace: str, sku: str, quantity: int) -> None: ...


class IBlingConnectionRepository(ABC):
    @abstractmethod
    async def get(self, provider: str) -> IntegrationConnection | None: ...

    @abstractmethod
    async def lock_for_update(self, provider: str) -> IntegrationConnection | None: ...

    @abstractmethod
    async def upsert(self, connection: IntegrationConnection) -> IntegrationConnection: ...
