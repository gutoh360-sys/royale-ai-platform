export type InsightKey = string & { readonly __brand: "InsightKey" }

export function buildInsightKey(module: string, content: string): InsightKey {
  const normalized = content
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${module}:insight:${normalized}` as InsightKey
}
