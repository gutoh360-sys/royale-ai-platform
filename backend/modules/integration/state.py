import secrets

from backend.core.ports.cache import ICacheService


class OAuthStateService:
    def __init__(self, cache: ICacheService, ttl_seconds: int) -> None:
        self._cache = cache
        self._ttl = ttl_seconds

    def _key(self, state: str) -> str:
        return f"oauth:state:{state}"

    def generate(self) -> str:
        return secrets.token_urlsafe(32)

    async def store(self, state: str) -> None:
        await self._cache.set(self._key(state), state, ttl=self._ttl)

    async def validate_and_consume(self, state: str) -> bool:
        stored = await self._cache.consume(self._key(state))
        if stored is None:
            return False
        return secrets.compare_digest(stored, state)
