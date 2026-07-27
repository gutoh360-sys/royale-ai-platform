import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentContainer({ children, className }: ContentContainerProps) {
  return (
    <div className={cn("flex-1 p-6", className)}>
      {children}
    </div>
  );
}
