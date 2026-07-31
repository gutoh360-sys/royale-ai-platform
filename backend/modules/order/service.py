from typing import Any

from backend.database.models.order import Order
from backend.modules.order.ports import IOrderRepository


class OrderService:
    def __init__(self, order_repo: IOrderRepository) -> None:
        self._order_repo = order_repo

    async def list_orders(self, status: str | None = None) -> list[Order]:
        return await self._order_repo.find_all(status)

    async def get_order(self, order_id: str) -> Order | None:
        return await self._order_repo.find_by_id(order_id)

    async def get_order_by_external_id(self, external_id: str, marketplace: str) -> Order | None:
        return await self._order_repo.find_by_external_id(external_id, marketplace)

    async def create_order(self, order: Order) -> Order:
        return await self._order_repo.save(order)

    async def update_order(self, order_id: str, data: dict[str, Any]) -> Order | None:
        order = await self._order_repo.find_by_id(order_id)
        if order is None:
            return None
        for key, value in data.items():
            setattr(order, key, value)
        return await self._order_repo.save(order)

    async def update_order_status(self, order_id: str, status: str) -> None:
        await self._order_repo.update_status(order_id, status)
