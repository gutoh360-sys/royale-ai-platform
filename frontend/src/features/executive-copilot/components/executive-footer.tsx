interface ExecutiveFooterProps {
  timestamp: string
}

export function ExecutiveFooter({ timestamp }: ExecutiveFooterProps) {
  const date = new Date(timestamp)
  const formatted = date.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  return (
    <div className="mt-8 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
      <span>Royale AI Platform v0.6.1</span>
      <span>Última atualização: {formatted}</span>
    </div>
  )
}
