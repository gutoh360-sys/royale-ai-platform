import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
const ADMIN_USER = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "";

export async function GET() {
  if (!ADMIN_USER || !ADMIN_PASS) {
    return NextResponse.json(
      { error: "Server auth not configured" },
      { status: 500 },
    );
  }

  const auth = "Basic " + btoa(`${ADMIN_USER}:${ADMIN_PASS}`);

  try {
    const res = await fetch(`${BACKEND}/integrations/bling/sync-status`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend" },
      { status: 502 },
    );
  }
}
