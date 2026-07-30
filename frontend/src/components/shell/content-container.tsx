import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentContainer({ children, className }: ContentContainerProps) {
  return (
    <div className={cn("container-page py-6 md:py-8 lg:py-10", className)}>
      {children}
    </div>
  );
}
