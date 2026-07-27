from backend.core.config.base import Settings
from backend.core.config.dev import DevSettings
from backend.core.config.homolog import HomologSettings
from backend.core.config.prod import ProdSettings


def test_base_settings_defaults() -> None:
    settings = Settings()
    assert settings.ENVIRONMENT == "dev"
    assert settings.DEBUG is True


def test_dev_settings() -> None:
    settings = DevSettings()
    assert settings.DEBUG is True
    assert settings.DATABASE_ECHO is True


def test_homolog_settings() -> None:
    settings = HomologSettings()
    assert settings.DEBUG is True
    assert settings.DATABASE_ECHO is False


def test_prod_settings() -> None:
    settings = ProdSettings()
    assert settings.DEBUG is False
    assert settings.DATABASE_ECHO is False
