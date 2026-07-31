from backend.core.exceptions import IntegrationError


class OAuthStateError(IntegrationError):
    pass


class OAuthExchangeError(IntegrationError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class OAuthRefreshError(IntegrationError):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class OAuthPermanentError(IntegrationError):
    pass


class TokenRevocationError(IntegrationError):
    pass


class ConnectionNotFoundError(IntegrationError):
    pass


class ConnectionTestScopeError(IntegrationError):
    pass


class ApiError(IntegrationError):
    pass
