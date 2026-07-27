from fastapi import FastAPI
from prometheus_client import Counter, Histogram, generate_latest
from starlette.responses import Response

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


def setup_prometheus(app: FastAPI) -> None:
    @app.get("/metrics")
    async def metrics() -> Response:
        return Response(content=generate_latest(), media_type="text/plain")
