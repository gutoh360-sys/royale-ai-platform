import { ChevronRight } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((segment, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          <span className="hover:text-foreground transition-colors">
            {segment.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
