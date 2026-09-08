from decimal import Decimal

from backend.core.period import BUSINESS_TZ, parse_period, period_to_range
from backend.modules.analytics.repository import AnalyticsRepository
from backend.modules.analytics.schemas import (
    AnalyticsDashboardResponse,
    MarketplaceRevenueItem,
    MarketplaceRevenueResponse,
    ProductAnalyticsResponse,
    ProductPerformanceItem,
    SalesByPeriodResponse,
)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository) -> None:
        self._repository = repository

    async def get_dashboard(self, period: str = "30d") -> AnalyticsDashboardResponse:
        parsed = parse_period(period)
        start, end = period_to_range(parsed, BUSINESS_TZ)

        non_cancelled_orders = await self._repository.count_completed_orders_in_period(start, end)
        revenue = Decimal(str(await self._repository.revenue_in_period(start, end)))
        average_ticket = round(revenue / non_cancelled_orders, 2) if non_cancelled_orders else None

        sales_by_period = [
            SalesByPeriodResponse(day=day, total_orders=count, revenue=Decimal(str(total)))
            for day, count, total in await self._repository.sales_by_period(
                start.date(), end.date()
            )
        ]

        return AnalyticsDashboardResponse(
            total_products=await self._repository.count_products(),
            active_products=await self._repository.count_active_products(),
            products_without_stock=await self._repository.count_products_without_stock(),
            total_stock=await self._repository.sum_stock(),
            total_orders=non_cancelled_orders,
            orders_by_status=await self._repository.orders_by_status_in_period(start, end),
            revenue=revenue,
            average_ticket=average_ticket,
            sales_by_period=sales_by_period,
            period=period,
        )

    async def get_product_analytics(self, period: str = "30d") -> ProductAnalyticsResponse:
        start, end = period_to_range(parse_period(period), BUSINESS_TZ)
        current = await self._repository.product_sales(start, end)
        previous = await self._repository.product_sales(start - (end - start), start)
        previous_revenues = {str(row["id"]): row["total_revenue"] for row in previous["products"]}
        products = []
        costed_revenue = total_cost = total_revenue = Decimal(0)
        for row in current["products"]:
            row = dict(row)
            revenue = Decimal(str(row["total_revenue"]))
            covered = Decimal(str(row.pop("costed_revenue")))
            cost = Decimal(str(row.pop("total_cost")))
            prior = Decimal(str(previous_revenues.get(str(row["id"]), 0)))
            row.update(
                id=str(row["id"]),
                category_id=str(row["category_id"]),
                margin=float((covered - cost) / covered * 100) if covered else None,
                cost_coverage=float(covered / revenue) if revenue else None,
                growth=float((revenue - prior) / prior * 100) if prior else None,
            )
            products.append(ProductPerformanceItem(**row))
            costed_revenue += covered
            total_cost += cost
            total_revenue += revenue
        prior_total = sum(
            (Decimal(str(row["total_revenue"])) for row in previous["products"]), Decimal(0)
        )
        eligible, with_items = current["eligible_orders"], current["orders_with_items"]
        return ProductAnalyticsResponse(
            products=products,
            total_products=len(products),
            period=period,
            total_revenue=float(total_revenue),
            total_orders=with_items,
            quantity=sum(p.quantity for p in products),
            average_margin=float((costed_revenue - total_cost) / costed_revenue * 100)
            if costed_revenue
            else None,
            cost_coverage=float(costed_revenue / total_revenue) if total_revenue else None,
            growth=float((total_revenue - prior_total) / prior_total * 100)
            if prior_total
            else None,
            eligible_orders=eligible,
            orders_with_items=with_items,
            coverage=with_items / eligible if eligible else None,
            top_sku=products[0].sku if products else None,
            top10=products[:10],
            sold_out=[p for p in products if p.stock_quantity <= 0][:10],
        )

    async def get_marketplace_revenue(self, period: str = "30d") -> MarketplaceRevenueResponse:
        parsed = parse_period(period)
        start, end = period_to_range(parsed, BUSINESS_TZ)

        raw_rows = await self._repository.marketplace_revenue_in_period(start, end)

        def normalize_for_grouping(value: str) -> str:
            import unicodedata

            value = value.strip().lower()
            value = unicodedata.normalize("NFD", value)
            value = "".join(c for c in value if unicodedata.category(c) != "Mn")
            value = "".join(c for c in value if c.isalnum())
            return value

        GROUP_RULES = [
            ("amazon", "Amazon", ["amazon"]),
            ("mercadolivre", "Mercado Livre", ["mercadolivre", "mercado_livre"]),
            ("shopee", "Shopee", ["shopee"]),
            ("magalu", "Magazine Luiza", ["magalu", "magazineluiza", "magazineluiza"]),
            ("tiktokshop", "TikTok Shop", ["tiktok"]),
            ("americanas", "Americanas", ["americanas"]),
            ("casasbahia", "Casas Bahia", ["casasbahia", "casas bahia"]),
            ("aliexpress", "AliExpress", ["aliexpress"]),
            ("shein", "Shein", ["shein"]),
        ]

        def resolve_marketplace_group(name: str | None, tipo: str | None) -> tuple[str, str]:
            candidates = [tipo or "", name or ""]
            for candidate in candidates:
                normalized = normalize_for_grouping(candidate)
                if not normalized:
                    continue
                for slug, display_name, patterns in GROUP_RULES:
                    for pattern in patterns:
                        if pattern in normalized:
                            return slug, display_name
            fallback = tipo or name or "Não identificado"
            fallback_slug = normalize_for_grouping(fallback) or "outro"
            return fallback_slug, fallback

        grouped: dict[str, dict] = {}

        for row in raw_rows:
            slug, display_name = resolve_marketplace_group(
                row["sales_channel_name"], row["sales_channel_tipo"]
            )

            if slug not in grouped:
                grouped[slug] = {
                    "marketplace_slug": slug,
                    "channel_name": display_name,
                    "total_orders": 0,
                    "total_revenue": 0.0,
                }

            grouped[slug]["total_orders"] += row["order_count"]
            grouped[slug]["total_revenue"] += row["total_amount"]

        total_orders = 0
        total_revenue = 0.0
        marketplace_items: list[MarketplaceRevenueItem] = []

        for slug, data in grouped.items():
            total_orders += data["total_orders"]
            total_revenue += data["total_revenue"]
            ticket = (
                round(data["total_revenue"] / data["total_orders"], 2)
                if data["total_orders"]
                else 0.0
            )
            marketplace_items.append(
                MarketplaceRevenueItem(
                    channel_id=None,
                    channel_name=data["channel_name"],
                    marketplace_slug=data["marketplace_slug"],
                    total_orders=data["total_orders"],
                    total_revenue=round(data["total_revenue"], 2),
                    average_ticket=ticket,
                )
            )

        marketplace_items.sort(key=lambda x: x.total_revenue, reverse=True)

        return MarketplaceRevenueResponse(
            marketplaces=marketplace_items,
            total_orders=total_orders,
            total_revenue=round(total_revenue, 2),
            period=period,
        )
