import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    db().prepare("SELECT 1").get();
    return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("db", { status: 503 });
  }
}
