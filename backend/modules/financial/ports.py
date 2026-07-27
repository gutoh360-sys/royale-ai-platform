from abc import ABC, abstractmethod
from typing import Any


class IFinancialRepository(ABC):
    @abstractmethod
    async def find_costs_by_product_id(self, product_id: str) -> Any: ...

    @abstractmethod
    async def save_cost(self, cost: Any) -> Any: ...


class ICostEngine(ABC):
    @abstractmethod
    async def calculate_cmv(self, order_id: str) -> float: ...

    @abstractmethod
    async def calculate_margin(self, order_id: str) -> float: ...
