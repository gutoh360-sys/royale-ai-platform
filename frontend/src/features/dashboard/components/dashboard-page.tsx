import { DashboardLayout } from "./dashboard-layout";
import { ExecutiveSummary } from "@/features/dashboard/executive-summary/components/executive-summary";
import { AIInsights } from "@/features/dashboard/ai-insights/components/ai-insights";
import { MarketplaceOverview } from "@/features/dashboard/marketplace-overview/components/marketplace-overview";
import { SalesMonitoring } from "@/features/dashboard/sales-monitoring/components/sales-monitoring";
import { ProductIntelligence } from "@/features/dashboard/product-intelligence/components/product-intelligence";
import { GoogleTrends } from "@/features/dashboard/google-trends/components/google-trends";
import { AlertsCenter } from "@/features/dashboard/alerts-center/components/alerts-center";
import { RecentActivity } from "@/features/dashboard/recent-activity/components/recent-activity";
import { QuickActions } from "@/features/dashboard/quick-actions/components/quick-actions";

export function DashboardPage() {
  return (
    <DashboardLayout>
      <ExecutiveSummary />
      <AIInsights />
      <MarketplaceOverview />
      <SalesMonitoring />
      <ProductIntelligence />
      <GoogleTrends />
      <AlertsCenter />
      <RecentActivity />
      <QuickActions />
    </DashboardLayout>
  );
}
