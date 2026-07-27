import pytest

from backend.core.config.base import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        DATABASE_URL="sqlite+aiosqlite:///./test.db",
        REDIS_URL="redis://localhost:6379/0",
        STORAGE_BACKEND="local",
        STORAGE_LOCAL_PATH="./test_storage",
        ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1jaGFycy0tLS0=",
        JWT_SECRET_KEY="test-jwt-secret-key",
        AI_GATEWAY_API_KEY="test-ai-gateway-key",
    )
