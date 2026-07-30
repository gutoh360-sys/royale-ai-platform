interface MarketplaceMetricProps {
  label: string;
  value: string;
  className?: string;
}

export function MarketplaceMetric({ label, value, className }: MarketplaceMetricProps) {
  return (
    <div className={className}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
