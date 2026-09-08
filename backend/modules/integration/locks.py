"""Redis-based distributed lock for sync operations."""

from __future__ import annotations

import uuid

from redis.asyncio import Redis

from backend.core.config import get_settings
from backend.core.di import get_redis_client

LOCK_KEY_PREFIX = "royale:sync:lock:"
LOCK_TTL_SECONDS = 600  # 10 minutes max lock duration


class SyncLock:
    def __init__(self, name: str):
        self.name = name
        self.key = f"{LOCK_KEY_PREFIX}{name}"
        self.owner = str(uuid.uuid4())
        self._redis: Redis | None = None

    async def acquire(self) -> bool:
        self._redis = get_redis_client(get_settings())
        result = await self._redis.set(self.key, self.owner, nx=True, ex=LOCK_TTL_SECONDS)
        return result is not None

    async def release(self) -> bool:
        if self._redis is None:
            return False
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = await self._redis.eval(script, 1, self.key, self.owner)
        return result == 1

    async def is_locked(self) -> bool:
        client = get_redis_client(get_settings())
        return await client.exists(self.key) > 0
