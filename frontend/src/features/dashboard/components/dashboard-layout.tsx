import { DashboardHeader } from "./dashboard-header";
import { ContentContainer } from "@/components/shell/content-container";
import type { Period } from "@/lib/period";

interface DashboardLayoutProps {
  children: React.ReactNode;
  period?: Period;
  onPeriodChange?: (period: Period) => void;
}

export function DashboardLayout({ children, period = "7d", onPeriodChange }: DashboardLayoutProps) {
  return (
    <ContentContainer>
      <div className="mb-10">
        <DashboardHeader period={period} onPeriodChange={onPeriodChange} />
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </ContentContainer>
  );
}
