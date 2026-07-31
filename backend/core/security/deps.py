import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from backend.core.config import get_settings
from backend.core.config.base import Settings

_basic_auth = HTTPBasic(auto_error=False)
_AUTHENTICATION_ERROR = "Invalid or missing administrative credentials"


def _is_configured(value: str) -> bool:
    return bool(value) and value == value.strip()


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_AUTHENTICATION_ERROR,
        headers={"WWW-Authenticate": "Basic"},
    )


def require_admin_auth(
    credentials: HTTPBasicCredentials | None = Depends(_basic_auth),
    settings: Settings = Depends(get_settings),
) -> None:
    username = settings.BLING_ADMIN_USERNAME
    password = settings.BLING_ADMIN_PASSWORD
    if credentials is None or not _is_configured(username) or not _is_configured(password):
        raise _unauthorized()

    username_matches = secrets.compare_digest(
        credentials.username.encode("utf-8"), username.encode("utf-8")
    )
    password_matches = secrets.compare_digest(
        credentials.password.encode("utf-8"), password.encode("utf-8")
    )
    if not username_matches or not password_matches:
        raise _unauthorized()
