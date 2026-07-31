from cryptography.fernet import Fernet

from backend.core.exceptions import ConfigurationError


class EncryptionService:
    def __init__(self, master_key: str):
        if not master_key:
            raise ConfigurationError("ENCRYPTION_KEY must be configured")
        self._fernet = Fernet(master_key.encode())

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self._fernet.decrypt(encrypted.encode()).decode()
