from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.di import get_category_service, get_product_service
from backend.database.models.category import Category
from backend.database.models.product import Product
from backend.modules.catalog.schemas import (
    CategoryCreate,
    CategoryResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from backend.modules.catalog.service import CategoryService, ProductService

products_router = APIRouter(prefix="/products", tags=["products"])


@products_router.get("", response_model=list[ProductResponse])
async def list_products(
    service: ProductService = Depends(get_product_service),
) -> list[ProductResponse]:
    return await service.list_products()


@products_router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    product = await service.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@products_router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    product = Product(
        sku=payload.sku,
        bling_id=payload.bling_id,
        ean=payload.ean,
        name=payload.name,
        description=payload.description,
        brand=payload.brand,
        category_id=payload.category_id,
        price=payload.price,
        cost=payload.cost,
        stock_quantity=payload.stock_quantity,
        active=payload.active,
        attributes=payload.attributes,
    )
    return await service.create_product(product)


@products_router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    service: ProductService = Depends(get_product_service),
) -> ProductResponse:
    existing = await service.get_product(product_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(existing, key, value)
    return await service.update_product(product_id, data)


@products_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
) -> None:
    await service.delete_product(product_id)


categories_router = APIRouter(prefix="/categories", tags=["categories"])


@categories_router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    service: CategoryService = Depends(get_category_service),
) -> CategoryResponse:
    category = await service.get_category(category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@categories_router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    service: CategoryService = Depends(get_category_service),
) -> CategoryResponse:
    category = Category(
        bling_id=payload.bling_id,
        name=payload.name,
        parent_id=payload.parent_id,
        path=payload.path,
        active=payload.active,
    )
    return await service.create_category(category)


router = APIRouter()
router.include_router(products_router)
router.include_router(categories_router)
