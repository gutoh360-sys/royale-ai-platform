from pathlib import Path

import aiofiles

from backend.core.config.base import Settings
from backend.core.ports.storage import IStorageBackend


class LocalStorage(IStorageBackend):
    def __init__(self, settings: Settings):
        self._base_path = Path(settings.STORAGE_LOCAL_PATH)
        self._base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, path: str, content: bytes) -> str:
        full_path = self._base_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(content)
        return str(full_path)

    async def read(self, path: str) -> bytes:
        full_path = self._base_path / path
        async with aiofiles.open(full_path, "rb") as f:
            return await f.read()  # type: ignore[no-any-return]

    async def delete(self, path: str) -> None:
        full_path = self._base_path / path
        if full_path.exists():
            full_path.unlink()

    async def exists(self, path: str) -> bool:
        full_path = self._base_path / path
        return full_path.exists()
