from fastapi import FastAPI

from backend.core.config.base import Settings


def setup_opentelemetry(app: FastAPI, settings: Settings) -> None:
    if settings.ENVIRONMENT == "dev":
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    provider = TracerProvider(
        resource=__import__("opentelemetry.sdk.resources", fromlist=["Resource"]).Resource.create(
            {"service.name": settings.OTEL_SERVICE_NAME}
        )
    )
    exporter = OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
