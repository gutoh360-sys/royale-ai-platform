from abc import ABC, abstractmethod


class IIntegrationOrchestrator(ABC):
    @abstractmethod
    async def sync_all_orders(self) -> None: ...

    @abstractmethod
    async def sync_all_products(self) -> None: ...

    @abstractmethod
    async def sync_stock(self, marketplace: str, sku: str, quantity: int) -> None: ...
