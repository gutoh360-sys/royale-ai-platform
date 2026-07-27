import pytest
from cryptography.fernet import Fernet

from backend.core.security.encryption import EncryptionService


def test_encrypt_decrypt_roundtrip() -> None:
    key = Fernet.generate_key().decode()
    service = EncryptionService(key)
    original = "royale_secret_value"
    encrypted = service.encrypt(original)
    decrypted = service.decrypt(encrypted)
    assert decrypted == original
    assert encrypted != original


def test_encrypt_different_values() -> None:
    key = Fernet.generate_key().decode()
    service = EncryptionService(key)
    v1 = service.encrypt("value1")
    v2 = service.encrypt("value2")
    assert v1 != v2


def test_invalid_key_raises_error() -> None:
    with pytest.raises(Exception):
        EncryptionService("invalid_key")
