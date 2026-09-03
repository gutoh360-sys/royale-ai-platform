import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "";

export async function POST(request: NextRequest) {
  if (!ADMIN_USER || !ADMIN_PASS) {
    return NextResponse.json(
      { error: "Server auth not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const auth = "Basic " + btoa(`${ADMIN_USER}:${ADMIN_PASS}`);

  try {
    const res = await fetch(
      `${BACKEND}/integrations/bling/backfill-order-items`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 },
    );
  }
}
