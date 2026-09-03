import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BlingSyncPage from "./page";
import {
  parseProductSyncState,
  parseSyncStatus,
  PRODUCT_SYNC_FALLBACK,
} from "./sync-central-state";
import { filterPermissions } from "@/auth/application/permission-service";
import { NAV_ITEMS } from "@/features/navigation/config";

const root = resolve(__dirname, "../../../../..");

describe("Bling sync central runtime safety", () => {
  it("renders the page shell without status data", () => {
    const html = renderToString(React.createElement(BlingSyncPage));

    expect(html).toContain("Central de Sincronização Bling");
    expect(html).toContain("Produtos");
    expect(html).toContain("Itens dos Pedidos");
  });

  it("accepts a valid sync-status response", () => {
    expect(
      parseSyncStatus({
        products_count: 10,
        orders_count: 20,
        order_items_count: 30,
        orders_without_items: 40,
        orders_without_channel: 50,
      }),
    ).toEqual({
      products_count: 10,
      orders_count: 20,
      order_items_count: 30,
      orders_without_items: 40,
      orders_without_channel: 50,
    });
  });

  it("rejects an invalid sync-status response without throwing", () => {
    expect(parseSyncStatus({ products: 10 })).toBeNull();
    expect(parseSyncStatus(null)).toBeNull();
  });

  it("discards corrupted localStorage JSON without throwing", () => {
    expect(parseProductSyncState("not-json")).toEqual(PRODUCT_SYNC_FALLBACK);
  });

  it("discards wrong-shaped localStorage values without throwing", () => {
    expect(parseProductSyncState("null")).toEqual(PRODUCT_SYNC_FALLBACK);
    expect(parseProductSyncState('{"startPage":201}')).toEqual(PRODUCT_SYNC_FALLBACK);
  });

  it("accepts valid saved product sync state", () => {
    expect(
      parseProductSyncState(
        JSON.stringify({
          startPage: 201,
          currentPage: 201,
          totals: {
            fetched: 1,
            processed: 2,
            created: 3,
            updated: 4,
            skipped: 5,
            failed: 0,
          },
        }),
      ),
    ).toEqual({
      startPage: 201,
      currentPage: 201,
      totals: {
        fetched: 1,
        processed: 2,
        created: 3,
        updated: 4,
        skipped: 5,
        failed: 0,
      },
    });
  });
});

describe("Bling sync central navigation", () => {
  it("adds Sync Bling to the real nav source", () => {
    const item = NAV_ITEMS.find((navItem) => navItem.label === "Sync Bling");

    expect(item?.href).toBe("/admin/integrations/bling");
  });

  it("keeps Sync Bling visible in the main menu", () => {
    const visible = filterPermissions([], NAV_ITEMS) as typeof NAV_ITEMS;

    expect(visible.some((item) => item.label === "Sync Bling")).toBe(true);
  });
});

describe("Bling sync central secret boundary", () => {
  it("keeps backend secrets out of client page code", () => {
    const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");

    expect(page).not.toMatch(/ADMIN_USERNAME|ADMIN_PASSWORD|BACKEND_URL|NEXT_PUBLIC/);
    expect(page).not.toMatch(/Authorization|Basic\s/);
  });

  it("keeps sync-status credentials server-side only", () => {
    const route = readFileSync(
      resolve(root, "app/api/integrations/sync-status/route.ts"),
      "utf8",
    );

    expect(route).toContain("BACKEND_URL");
    expect(route).toContain("ADMIN_USERNAME");
    expect(route).toContain("ADMIN_PASSWORD");
    expect(route).toContain("Buffer.from");
    expect(route).toContain("/integrations/bling/sync-status");
    expect(route).not.toContain("NEXT_PUBLIC");
  });
});
