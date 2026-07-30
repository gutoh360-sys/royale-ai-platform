import { Logo } from "@/components/shell/logo";

interface SidebarHeaderProps {
  collapsed: boolean;
}

export function SidebarHeader({ collapsed }: SidebarHeaderProps) {
  return (
    <div className="flex h-12 items-center gap-2 px-3">
      <Logo collapsed={collapsed} />
    </div>
  );
}
