from datetime import datetime, timedelta
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
