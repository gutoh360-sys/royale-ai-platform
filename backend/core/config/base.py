from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENVIRONMENT: str = "dev"
    DEBUG: bool = True

    DATABASE_URL: str = (
        "postgresql+asyncpg://royale:royale_dev_password@localhost:5432/royale_platform"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    ENCRYPTION_KEY: str = ""
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    AI_GATEWAY_API_KEY: str = ""
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"

    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_PATH: str = "./storage"
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_BUCKET_NAME: str = "royale-platform"

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    RATE_LIMIT_PER_MINUTE: int = 60

    OTEL_SERVICE_NAME: str = "royale-platform"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://otel-collector:4317"
