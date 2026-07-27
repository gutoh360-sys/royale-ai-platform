class RoyaleError(Exception):
    pass


class ConfigurationError(RoyaleError):
    pass


class DatabaseError(RoyaleError):
    pass


class StorageError(RoyaleError):
    pass


class CacheError(RoyaleError):
    pass


class IntegrationError(RoyaleError):
    pass


class AuthenticationError(RoyaleError):
    pass


class ValidationError(RoyaleError):
    pass
