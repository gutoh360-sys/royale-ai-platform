# Task 1: Backend — Canonical period helper

**Files:**
- Create: `backend/core/period.py`
- Test: `backend/tests/unit/test_period.py`

**Interfaces:**
- Consumes: None (new module)
- Produces: `parse_period(value: str) -> Period`, `period_to_range(period: Period, tz: ZoneInfo) -> tuple[datetime, datetime]`

**Steps:**

1. Write failing test in `backend/tests/unit/test_period.py`
2. Run test to verify it fails
3. Write implementation in `backend/core/period.py`
4. Run test to verify it passes
5. Commit

**Test code:**

```python
# backend/tests/unit/test_period.py
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from backend.core.period import parse_period, period_to_range

TZ = ZoneInfo("America/Sao_Paulo")

def test_parse_period_valid():
    assert parse_period("today") == "today"
    assert parse_period("7d") == "7d"
    assert parse_period("30d") == "30d"
    assert parse_period("90d") == "90d"
    assert parse_period("12m") == "12m"

def test_parse_period_invalid():
    import pytest
    with pytest.raises(ValueError):
        parse_period("invalid")
    with pytest.raises(ValueError):
        parse_period("1d")

def test_period_today_range():
    start, end = period_to_range("today", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today
    assert end.date() == today + timedelta(days=1)

def test_period_7d_range():
    start, end = period_to_range("7d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=6)
    assert end.date() == today + timedelta(days=1)

def test_period_30d_range():
    start, end = period_to_range("30d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=29)
    assert end.date() == today + timedelta(days=1)

def test_period_90d_range():
    start, end = period_to_range("90d", TZ)
    today = datetime.now(TZ).date()
    assert start.date() == today - timedelta(days=89)
    assert end.date() == today + timedelta(days=1)

def test_period_12m_range():
    start, end = period_to_range("12m", TZ)
    today = datetime.now(TZ).date()
    expected_start = today.replace(year=today.year - 1)
    assert start.date() == expected_start
    assert end.date() == today + timedelta(days=1)

def test_start_inclusive_end_exclusive():
    """ordered_at >= start AND ordered_at < end"""
    start, end = period_to_range("7d", TZ)
    assert start.tzinfo is not None
    assert end.tzinfo is not None
```

**Implementation code:**

```python
# backend/core/period.py
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Literal

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
```

**Work from:** `C:\Users\gutod\Documents\royale-platform`

**Report file:** `C:\Users\gutod\Documents\royale-platform\.superpowers\sdd\task-1-report.md`
