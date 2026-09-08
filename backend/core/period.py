from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

Period = Literal["today", "7d", "30d", "90d", "12m"]

VALID_PERIODS = {"today", "7d", "30d", "90d", "12m"}

BUSINESS_TZ = ZoneInfo("America/Sao_Paulo")


def parse_period(value: str) -> Period:
    if value not in VALID_PERIODS:
        raise ValueError(f"Invalid period: {value!r}. Must be one of {VALID_PERIODS}")
    return value  # type: ignore[return-value]


def period_to_range(period: Period, tz: ZoneInfo = BUSINESS_TZ) -> tuple[datetime, datetime]:
    """Return (start_inclusive, end_exclusive) for the given period in the given timezone."""
    now = datetime.now(tz)
    today = now.date()

    if period == "today":
        start_date = today
    elif period == "7d":
        start_date = today - timedelta(days=6)
    elif period == "30d":
        start_date = today - timedelta(days=29)
    elif period == "90d":
        start_date = today - timedelta(days=89)
    elif period == "12m":
        start_date = today.replace(year=today.year - 1)
    else:
        raise ValueError(f"Unhandled period: {period}")

    start = datetime(start_date.year, start_date.month, start_date.day, tzinfo=tz)
    end_date = today + timedelta(days=1)
    end = datetime(end_date.year, end_date.month, end_date.day, tzinfo=tz)

    return start, end
