export function normalizeInternalHref(href: string): string {
  const trimmed = href.trim();

  if (trimmed === "#") return "#";
  if (!trimmed) return "/";

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return "/";
  }

  return `/${trimmed.replace(/^\/+/, "")}`;
}
