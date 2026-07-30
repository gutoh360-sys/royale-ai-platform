import { DashboardHeader } from "./dashboard-header";
import { ContentContainer } from "@/components/shell/content-container";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ContentContainer>
      <div className="mb-10">
        <DashboardHeader />
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </ContentContainer>
  );
}
