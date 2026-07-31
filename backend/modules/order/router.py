from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError

from backend.core.di import get_order_service
from backend.database.models.order import Order, OrderItem
from backend.modules.order.schemas import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    OrderUpdate,
)
from backend.modules.order.service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = Query(default=None, max_length=50),
    service: OrderService = Depends(get_order_service),
) -> list[Order]:
    return await service.list_orders(status)


@router.get("/external/{external_id}", response_model=OrderResponse)
async def get_order_by_external_id(
    external_id: str,
    marketplace: str = "bling",
    service: OrderService = Depends(get_order_service),
) -> Order:
    order = await service.get_order_by_external_id(external_id, marketplace)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
) -> Order:
    order = await service.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    service: OrderService = Depends(get_order_service),
) -> Order:
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
        items=[
            OrderItem(
                product_id=item.product_id,
                sku=item.sku,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                cost=item.cost,
            )
            for item in payload.items
        ],
    )
    try:
        return await service.create_order(order)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order cannot be created because it violates a data constraint",
        ) from exc


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    payload: OrderUpdate,
    service: OrderService = Depends(get_order_service),
) -> Order:
    existing = await service.get_order(order_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    data = payload.model_dump(exclude_unset=True)
    try:
        updated = await service.update_order(order_id, data)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order cannot be updated because it violates a data constraint",
        ) from exc
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return updated


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    service: OrderService = Depends(get_order_service),
) -> Order:
    existing = await service.get_order(order_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    await service.update_order_status(order_id, payload.status)
    updated = await service.get_order(order_id)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return updated
