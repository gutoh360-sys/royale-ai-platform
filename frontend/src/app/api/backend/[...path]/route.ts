import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] };
};

const ALLOWED_GET_PATHS = new Set([
  "analytics/dashboard",
  "orders",
  "products",
  "sales-channels",
]);

const ALLOWED_QUERY_PARAMS: Record<string, Set<string>> = {
  "analytics/dashboard": new Set(["days"]),
  orders: new Set(["status"]),
  products: new Set(),
  "sales-channels": new Set(),
};

function serverAuth() {
  const user = process.env.BLING_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? "";
  const password = process.env.BLING_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";

  if (!user || !password) return null;
  return `Basic ${btoa(`${user}:${password}`)}`;
}

function backendUrl(path: string, sourceUrl: string) {
  const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
  const url = new URL(`/${path}`, backend);
  const source = new URL(sourceUrl);
  const allowedParams = ALLOWED_QUERY_PARAMS[path] ?? new Set<string>();

  for (const [key, value] of source.searchParams.entries()) {
    if (allowedParams.has(key)) url.searchParams.append(key, value);
  }

  return url;
}

function logProxyFailure(path: string, status: number, detail?: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[backend-proxy] request failed", {
    path,
    status,
    detail: detail?.slice(0, 500),
  });
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params;
  const path = params.path.join("/");

  if (!ALLOWED_GET_PATHS.has(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = serverAuth();
  if (!auth) {
    logProxyFailure(path, 500, "Server auth not configured");
    return NextResponse.json(
      { error: "Server auth not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(backendUrl(path, req.url).toString(), {
      method: "GET",
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logProxyFailure(path, res.status, detail);
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    logProxyFailure(path, 502, e instanceof Error ? e.message : "Unknown error");
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 },
    );
  }
}
