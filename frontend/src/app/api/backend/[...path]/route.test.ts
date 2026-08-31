import { afterEach, describe, expect, it, vi } from "vitest";

type RouteContext = { params: Promise<{ path: string[] }> };

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

function context(path: string[]): RouteContext {
  return { params: Promise.resolve({ path }) };
}

describe("backend proxy route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses BACKEND_URL and server-side Basic Auth", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.test");
    vi.stubEnv("ADMIN_USERNAME", "proxy-user");
    vi.stubEnv("ADMIN_PASSWORD", "proxy-pass");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: "o1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://frontend.test/api/backend/orders?status=pending"),
      context(["orders"]),
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers as HeadersInit);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/orders?status=pending",
      expect.objectContaining({ method: "GET" }),
    );
    expect(headers.get("Authorization")).toBe(`Basic ${btoa("proxy-user:proxy-pass")}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "o1" }]);
  });

  it("can use backend BLING_ADMIN credentials when generic admin vars are absent", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.test");
    vi.stubEnv("BLING_ADMIN_USERNAME", "bling-user");
    vi.stubEnv("BLING_ADMIN_PASSWORD", "bling-pass");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: "channel-1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://frontend.test/api/backend/sales-channels"),
      context(["sales-channels"]),
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers as HeadersInit);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/sales-channels",
      expect.objectContaining({ method: "GET" }),
    );
    expect(headers.get("Authorization")).toBe(`Basic ${btoa("bling-user:bling-pass")}`);
    expect(response.status).toBe(200);
  });

  it("does not forward browser Authorization headers", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.test");
    vi.stubEnv("ADMIN_USERNAME", "proxy-user");
    vi.stubEnv("ADMIN_PASSWORD", "proxy-pass");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    await GET(
      new Request("http://frontend.test/api/backend/products", {
        headers: { Authorization: "Basic attacker" },
      }),
      context(["products"]),
    );

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers as HeadersInit);

    expect(headers.get("Authorization")).toBe(`Basic ${btoa("proxy-user:proxy-pass")}`);
    expect(headers.get("Authorization")).not.toBe("Basic attacker");
  });

  it.each([401, 403])("returns controlled errors for backend status %i", async (status) => {
    vi.stubEnv("BACKEND_URL", "https://backend.test");
    vi.stubEnv("ADMIN_USERNAME", "proxy-user");
    vi.stubEnv("ADMIN_PASSWORD", "proxy-pass");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "denied" }, { status })));

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://frontend.test/api/backend/orders"),
      context(["orders"]),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: `Backend returned ${status}` });
  });

  it("requires server-side credentials", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.test");
    vi.stubEnv("ADMIN_USERNAME", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("http://frontend.test/api/backend/orders"),
      context(["orders"]),
    );

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Server auth not configured" });
  });
});
