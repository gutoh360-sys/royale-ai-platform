import { ContentContainer } from "@/components/shell/content-container";
import { PageTitle } from "@/components/shell/page-title";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ContentContainer>
      <PageTitle
        title="Dashboard"
        description="Bem-vindo à Royale AI Platform"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </ContentContainer>
  );
}
