from typing import Any

from redis.asyncio import Redis

from backend.core.config.base import Settings
from backend.core.ports.cache import ICacheService


class RedisCacheService(ICacheService):
    def __init__(self, settings: Settings):
        self._client: Redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def get(self, key: str) -> Any | None:
        value = await self._client.get(key)
        return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._client.set(key, value, ex=ttl)

    async def delete(self, pattern: str) -> None:
        keys = await self._client.keys(pattern)
        if keys:
            await self._client.delete(*keys)

    async def exists(self, key: str) -> bool:
        return await self._client.exists(key) > 0
