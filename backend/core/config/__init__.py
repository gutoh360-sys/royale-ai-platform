from functools import lru_cache

from backend.core.config.base import Settings
from backend.core.config.dev import DevSettings
from backend.core.config.homolog import HomologSettings
from backend.core.config.prod import ProdSettings


@lru_cache
def get_settings() -> Settings:
    env = __import__("os").environ.get("ENVIRONMENT", "dev")
    settings_map = {
        "dev": DevSettings,
        "homolog": HomologSettings,
        "prod": ProdSettings,
    }
    settings_class = settings_map.get(env, DevSettings)
    return settings_class()


__all__ = ["Settings", "DevSettings", "HomologSettings", "ProdSettings", "get_settings"]
