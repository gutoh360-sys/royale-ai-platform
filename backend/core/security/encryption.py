from cryptography.fernet import Fernet


class EncryptionService:
    def __init__(self, master_key: str):
        self._fernet = Fernet(master_key.encode())

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self._fernet.decrypt(encrypted.encode()).decode()
