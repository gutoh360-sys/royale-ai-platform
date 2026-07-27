from abc import ABC, abstractmethod


class IStorageBackend(ABC):
    @abstractmethod
    async def save(self, path: str, content: bytes) -> str: ...

    @abstractmethod
    async def read(self, path: str) -> bytes: ...

    @abstractmethod
    async def delete(self, path: str) -> None: ...

    @abstractmethod
    async def exists(self, path: str) -> bool: ...
