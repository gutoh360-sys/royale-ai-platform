from abc import ABC, abstractmethod
from typing import Any


class IReportEngine(ABC):
    @abstractmethod
    async def generate_pdf(self, report_type: str, filters: dict[str, Any]) -> bytes: ...

    @abstractmethod
    async def generate_csv(self, report_type: str, filters: dict[str, Any]) -> str: ...

    @abstractmethod
    async def generate_xlsx(self, report_type: str, filters: dict[str, Any]) -> bytes: ...
