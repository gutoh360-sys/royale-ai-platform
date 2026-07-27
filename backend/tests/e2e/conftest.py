import pytest


@pytest.fixture(scope="session")
def e2e_settings() -> dict[str, str]:
    return {
        "api_url": "http://localhost:8000",
    }
