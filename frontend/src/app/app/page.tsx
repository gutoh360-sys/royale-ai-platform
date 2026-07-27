import { AppShell } from "@/components/shell/app-shell";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";

export default function AppPage() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}
