from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.di import get_db_session, get_redis_client

router = APIRouter(tags=["health"])


@router.get("/health/liveness")
async def liveness() -> dict[str, str]:
    return {"status": "alive", "service": "royale-platform"}


@router.get("/health/readiness")
async def readiness(
    db: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis_client),
) -> dict[str, str]:
    db_ok = False
    redis_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        await redis.ping()
        redis_ok = True
    except Exception:
        pass

    return {
        "status": "ready" if (db_ok and redis_ok) else "not_ready",
        "database": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }


@router.get("/health/startup")
async def startup() -> dict[str, str]:
    return {"status": "started", "service": "royale-platform"}
