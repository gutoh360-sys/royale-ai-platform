from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    product_id: UUID
    sku: str
    product_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    cost: Decimal | None
    created_at: datetime


class OrderItemCreate(BaseModel):
    product_id: UUID
    sku: str = Field(..., max_length=50)
    product_name: str = Field(..., max_length=200)
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., decimal_places=2, ge=0)
    total_price: Decimal = Field(..., decimal_places=2, ge=0)
    cost: Decimal | None = Field(None, decimal_places=2, ge=0)


class OrderCreate(BaseModel):
    external_id: str = Field(..., max_length=50)
    marketplace: str = Field("bling", max_length=50)
    order_number: str = Field(..., max_length=50)
    customer_name: str = Field(..., max_length=200)
    customer_document: str | None = Field(None, max_length=20)
    customer_email: str | None = Field(None, max_length=200)
    customer_phone: str | None = Field(None, max_length=20)
    status: str = Field("pending", max_length=50)
    total_amount: Decimal = Field(..., decimal_places=2, ge=0)
    shipping_amount: Decimal | None = Field(None, decimal_places=2, ge=0)
    discount_amount: Decimal | None = Field(None, decimal_places=2, ge=0)
    payment_method: str | None = Field(None, max_length=100)
    notes: str | None = None
    ordered_at: datetime


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., max_length=50)


class OrderUpdate(BaseModel):
    external_id: str | None = Field(None, max_length=50)
    marketplace: str | None = Field(None, max_length=50)
    order_number: str | None = Field(None, max_length=50)
    customer_name: str | None = Field(None, max_length=200)
    customer_document: str | None = Field(None, max_length=20)
    customer_email: str | None = Field(None, max_length=200)
    customer_phone: str | None = Field(None, max_length=20)
    status: str | None = Field(None, max_length=50)
    total_amount: Decimal | None = Field(None, decimal_places=2, ge=0)
    shipping_amount: Decimal | None = Field(None, decimal_places=2, ge=0)
    discount_amount: Decimal | None = Field(None, decimal_places=2, ge=0)
    payment_method: str | None = Field(None, max_length=100)
    notes: str | None = None
    ordered_at: datetime | None = None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    external_id: str
    marketplace: str
    order_number: str
    customer_name: str
    customer_document: str | None
    customer_email: str | None
    customer_phone: str | None
    status: str
    total_amount: Decimal
    shipping_amount: Decimal | None
    discount_amount: Decimal | None
    payment_method: str | None
    notes: str | None
    ordered_at: datetime
    created_at: datetime
    updated_at: datetime
    last_synced_at: datetime | None
    items: list[OrderItemResponse]
