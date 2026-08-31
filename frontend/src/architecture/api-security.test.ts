import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

const clientFiles = [
  "lib/api.ts",
  "services/api-marketplace.ts",
  "services/api-orders.ts",
  "services/api-products.ts",
  "services/api-inventory.ts",
  "services/api-command-center.ts",
  "features/dashboard/components/dashboard-page.tsx",
  "features/marketplace/components/marketplace-overview.tsx",
  "features/products-executive/components/products-detail-page.tsx",
  "features/inventory-executive/components/inventory-detail-page.tsx",
  "features/sales-executive/sales-detail-page.tsx",
];

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("frontend API security boundary", () => {
  it("keeps server credentials out of client-side API and screen code", () => {
    const clientSource = clientFiles.map(readSource).join("\n");

    expect(clientSource).not.toMatch(/ADMIN_USERNAME|ADMIN_PASSWORD|BLING_ADMIN|NEXT_PUBLIC_API_URL/);
    expect(clientSource).not.toMatch(/Authorization|Basic\s/);
    expect(clientSource).not.toContain("http://localhost:8000");
  });

  it("keeps Basic Auth only in server-side API routes", () => {
    const proxySource = readSource("app/api/backend/[...path]/route.ts");

    expect(proxySource).toContain("BACKEND_URL");
    expect(proxySource).toContain("ADMIN_USERNAME");
    expect(proxySource).toContain("ADMIN_PASSWORD");
    expect(proxySource).toContain("Authorization");
    expect(proxySource).toContain("Basic");
  });
});
