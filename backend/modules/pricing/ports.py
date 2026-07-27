from abc import ABC, abstractmethod
from typing import Any


class IPriceRepository(ABC):
    @abstractmethod
    async def find_by_product_id(self, product_id: str) -> Any: ...

    @abstractmethod
    async def save(self, price: Any) -> Any: ...


class IPricingEngine(ABC):
    @abstractmethod
    async def calculate_suggested_price(self, product_id: str) -> float: ...
