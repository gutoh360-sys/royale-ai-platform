import asyncio
from functools import partial

import boto3
from botocore.exceptions import ClientError

from backend.core.config.base import Settings
from backend.core.ports.storage import IStorageBackend


class S3Storage(IStorageBackend):
    def __init__(self, settings: Settings):
        self._bucket = settings.S3_BUCKET_NAME
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        )

    async def _ensure_bucket(self) -> None:
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None, partial(self._client.head_bucket, Bucket=self._bucket)
            )
        except ClientError:
            await loop.run_in_executor(
                None, partial(self._client.create_bucket, Bucket=self._bucket)
            )

    async def save(self, path: str, content: bytes) -> str:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            partial(self._client.put_object, Bucket=self._bucket, Key=path, Body=content),
        )
        return path

    async def read(self, path: str) -> bytes:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None, partial(self._client.get_object, Bucket=self._bucket, Key=path)
        )
        return response["Body"].read()

    async def delete(self, path: str) -> None:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            partial(self._client.delete_object, Bucket=self._bucket, Key=path),
        )

    async def exists(self, path: str) -> bool:
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None, partial(self._client.head_object, Bucket=self._bucket, Key=path)
            )
            return True
        except ClientError:
            return False
