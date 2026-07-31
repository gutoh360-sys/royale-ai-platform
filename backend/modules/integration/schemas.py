from datetime import datetime

from pydantic import BaseModel


class AuthorizationUrlResponse(BaseModel):
    authorization_url: str


class CallbackResponse(BaseModel):
    status: str
    message: str


class ConnectionStatusResponse(BaseModel):
    provider: str
    status: str
    connected: bool
    last_authenticated_at: datetime | None
    scopes: list[str] | None


class ConnectionTestResponse(BaseModel):
    status: str
    detail: str
