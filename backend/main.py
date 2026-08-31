from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.api.health import health_router
from backend.core.config import get_settings
from backend.core.logging import setup_logging
from backend.core.middleware import (
    CorrelationIDMiddleware,
    SecurityHeadersMiddleware,
    setup_cors,
    setup_rate_limit,
)
from backend.core.observability import setup_opentelemetry, setup_prometheus
from backend.modules.analytics.router import router as analytics_router
from backend.modules.catalog.router import router as catalog_router
from backend.modules.integration.router import router as integration_router
from backend.modules.order.router import router as order_router
from backend.modules.sales_channel.router import router as sales_channel_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    setup_logging(settings.ENVIRONMENT)
    setup_opentelemetry(app, settings)
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Royale AI Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(CorrelationIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    setup_cors(app, settings)
    setup_rate_limit(app, settings)
    setup_prometheus(app)

    app.include_router(health_router)
    app.include_router(catalog_router)
    app.include_router(order_router)
    app.include_router(sales_channel_router)
    app.include_router(integration_router)
    app.include_router(analytics_router)

    return app


app = create_app()
