from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.di import get_order_service
from backend.database.models.order import Order
from backend.modules.order.schemas import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
)
from backend.modules.order.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/external/{external_id}", response_model=OrderResponse)
async def get_order_by_external_id(
    external_id: str,
    marketplace: str = "bling",
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = await service.get_order_by_external_id(external_id, marketplace)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    order = Order(
        external_id=payload.external_id,
        marketplace=payload.marketplace,
        order_number=payload.order_number,
        customer_name=payload.customer_name,
        customer_document=payload.customer_document,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        status=payload.status,
        total_amount=payload.total_amount,
        shipping_amount=payload.shipping_amount,
        discount_amount=payload.discount_amount,
        payment_method=payload.payment_method,
        notes=payload.notes,
        ordered_at=payload.ordered_at,
    )
    return await service.create_order(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    service: OrderService = Depends(get_order_service),
) -> OrderResponse:
    existing = await service.get_order(order_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    await service.update_order_status(order_id, payload.status)
    updated = await service.get_order(order_id)
    return updated
