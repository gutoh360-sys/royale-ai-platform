from backend.core.config.base import Settings


class HomologSettings(Settings):
    DEBUG: bool = True
    DATABASE_ECHO: bool = False
