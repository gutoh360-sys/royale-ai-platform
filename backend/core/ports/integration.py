from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from typing import Any


class OrderDTO:
    def __init__(self, external_id: str, marketplace: str, data: dict[str, Any]) -> None:
        self.external_id = external_id
        self.marketplace = marketplace
        self.data = data


class ProductDTO:
    def __init__(self, sku: str, marketplace: str, data: dict[str, Any]) -> None:
        self.sku = sku
        self.marketplace = marketplace
        self.data = data


class IIntegrationChannel(ABC):
    @abstractmethod
    async def fetch_orders(self, since: datetime) -> list[OrderDTO]: ...

    @abstractmethod
    async def fetch_products(self) -> list[ProductDTO]: ...

    @abstractmethod
    async def sync_stock(self, sku: str, quantity: int) -> bool: ...

    @abstractmethod
    async def update_price(self, sku: str, price: Decimal) -> bool: ...
