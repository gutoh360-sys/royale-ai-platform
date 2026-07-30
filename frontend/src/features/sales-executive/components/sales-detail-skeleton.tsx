export function SalesDetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-6 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-lg border bg-card" />
        <div className="h-64 rounded-lg border bg-card" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 rounded-lg border bg-card" />
        <div className="h-48 rounded-lg border bg-card" />
      </div>
    </div>
  )
}
