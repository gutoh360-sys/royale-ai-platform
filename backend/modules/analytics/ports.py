from abc import ABC, abstractmethod
from typing import Any


class IAnalyticsEngine(ABC):
    @abstractmethod
    async def calculate_cmv(self, order_id: str) -> float: ...

    @abstractmethod
    async def calculate_margin(self, order_id: str) -> float: ...

    @abstractmethod
    async def calculate_abc_curve(self) -> Any: ...

    @abstractmethod
    async def calculate_ticket_average(self) -> float: ...
