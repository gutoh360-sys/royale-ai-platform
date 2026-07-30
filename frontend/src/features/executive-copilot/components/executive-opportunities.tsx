interface ExecutiveOpportunitiesProps {
  count: number
}

export function ExecutiveOpportunities({ count }: ExecutiveOpportunitiesProps) {
  return (
    <div>
      <p className="font-heading text-4xl font-bold tracking-tight tabular">{count}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {count > 0
          ? `${count} produtos prontos para impulsionar vendas`
          : "Nenhuma oportunidade identificada"}
      </p>
    </div>
  )
}
