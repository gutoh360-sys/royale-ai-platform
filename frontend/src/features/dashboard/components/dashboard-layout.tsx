import { DashboardHeader } from "./dashboard-header";
import { ContentContainer } from "@/components/shell/content-container";
import type { AnalyticsPeriodDays } from "@/types/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
  days?: AnalyticsPeriodDays;
  onDaysChange?: (days: AnalyticsPeriodDays) => void;
}

export function DashboardLayout({ children, days = 7, onDaysChange }: DashboardLayoutProps) {
  return (
    <ContentContainer>
      <div className="mb-10">
        <DashboardHeader days={days} onDaysChange={onDaysChange} />
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </ContentContainer>
  );
}
