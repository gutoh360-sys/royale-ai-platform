from backend.core.config.base import Settings


class ProdSettings(Settings):
    DEBUG: bool = False
    DATABASE_ECHO: bool = False
