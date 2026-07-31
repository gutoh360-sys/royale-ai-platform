from fastapi import HTTPException, status


def require_admin_auth() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "Administrative authentication is not configured yet; "
            "this route is disabled to avoid public exposure"
        ),
    )
