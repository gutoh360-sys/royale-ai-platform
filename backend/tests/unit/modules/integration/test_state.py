import asyncio

import pytest_asyncio

from backend.core.cache.redis import RedisCacheService
from backend.modules.integration.state import OAuthStateService


@pytest_asyncio.fixture
async def state_service(
    redis_cache: RedisCacheService,
) -> OAuthStateService:
    return OAuthStateService(redis_cache, ttl_seconds=60)


async def test_generate_returns_secure_random_state(
    state_service: OAuthStateService,
) -> None:
    state = state_service.generate()
    assert isinstance(state, str)
    assert len(state) >= 32
    assert state != state_service.generate()


async def test_valid_state_is_accepted_once(state_service: OAuthStateService) -> None:
    state = state_service.generate()
    await state_service.store(state)

    assert await state_service.validate_and_consume(state) is True
    assert await state_service.validate_and_consume(state) is False


async def test_absent_state_rejected(state_service: OAuthStateService) -> None:
    assert await state_service.validate_and_consume("never-stored") is False


async def test_mismatched_state_rejected(state_service: OAuthStateService) -> None:
    await state_service.store("expected-state")
    assert await state_service.validate_and_consume("other-state") is False
    assert await state_service.validate_and_consume("expected-state") is True


async def test_expired_state_rejected(redis_cache: RedisCacheService) -> None:
    service = OAuthStateService(redis_cache, ttl_seconds=1)
    state = service.generate()
    await service.store(state)
    await asyncio.sleep(1.2)
    assert await service.validate_and_consume(state) is False


async def test_two_concurrent_consumptions_only_one_wins(
    state_service: OAuthStateService,
) -> None:
    state = state_service.generate()
    await state_service.store(state)

    results = await asyncio.gather(
        state_service.validate_and_consume(state),
        state_service.validate_and_consume(state),
    )

    assert sorted(results) == [False, True]
