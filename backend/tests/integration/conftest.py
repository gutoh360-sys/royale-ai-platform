from typing import Any

import pytest


@pytest.fixture(scope="session")
def docker_services() -> Any:
    try:
        from testcontainers.postgres import PostgresContainer
        from testcontainers.redis import RedisContainer

        with PostgresContainer("postgres:16-alpine") as pg:
            with RedisContainer("redis:7-alpine") as redis:
                yield {
                    "postgres_url": pg.get_connection_url(),
                    "redis_url": redis.get_connection_url(),
                }
    except ImportError:
        pytest.skip("testcontainers not available", allow_module_level=True)
        return None
