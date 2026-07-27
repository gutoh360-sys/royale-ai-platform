from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    sku: str = Field(..., max_length=50)
    bling_id: str = Field(..., max_length=50)
    ean: str | None = Field(None, max_length=13)
    name: str = Field(..., max_length=200)
    description: str | None = None
    brand: str | None = Field(None, max_length=100)
    category_id: UUID
    price: Decimal = Field(..., decimal_places=2, ge=0)
    cost: Decimal | None = Field(None, decimal_places=2, ge=0)
    stock_quantity: int = Field(0, ge=0)
    active: bool = True
    attributes: dict[str, Any] | None = None


class ProductUpdate(BaseModel):
    sku: str | None = Field(None, max_length=50)
    bling_id: str | None = Field(None, max_length=50)
    ean: str | None = Field(None, max_length=13)
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    brand: str | None = Field(None, max_length=100)
    category_id: UUID | None = None
    price: Decimal | None = Field(None, decimal_places=2, ge=0)
    cost: Decimal | None = Field(None, decimal_places=2, ge=0)
    stock_quantity: int | None = Field(None, ge=0)
    active: bool | None = None
    attributes: dict[str, Any] | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    bling_id: str
    ean: str | None
    name: str
    description: str | None
    brand: str | None
    category_id: UUID
    price: Decimal
    cost: Decimal | None
    stock_quantity: int
    active: bool
    attributes: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    last_synced_at: datetime | None


class CategoryCreate(BaseModel):
    bling_id: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    parent_id: UUID | None = None
    path: str | None = Field(None, max_length=500)
    active: bool = True


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    bling_id: str
    name: str
    parent_id: UUID | None
    path: str | None
    active: bool
    created_at: datetime
    updated_at: datetime
