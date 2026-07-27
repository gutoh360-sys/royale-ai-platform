from backend.core.config.base import Settings


class DevSettings(Settings):
    DEBUG: bool = True
    DATABASE_ECHO: bool = True
