import { redirect } from "next/navigation";

const MOCK_AUTHENTICATED = true;

export function AuthGate(): null {
  if (MOCK_AUTHENTICATED) {
    redirect("/app");
  }
  redirect("/login");
  return null;
}
