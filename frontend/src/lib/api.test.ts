import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("browser API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["/orders", "/api/backend/orders"],
    ["/products", "/api/backend/products"],
    ["/sales-channels", "/api/backend/sales-channels"],
    ["/analytics/dashboard?days=7", "/api/backend/analytics/dashboard?days=7"],
  ])("calls backend reads through a relative Next.js proxy for %s", async (path, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await api.get(path);

    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers as HeadersInit);

    expect(url).toBe(expected);
    expect(String(url)).not.toMatch(/^https?:\/\//);
    expect(headers.has("Authorization")).toBe(false);
  });

  it.each([401, 403])("preserves protected backend status %i from the proxy", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Backend returned" }, { status })));

    await expect(api.get("/orders")).rejects.toMatchObject({ status });
  });
});
