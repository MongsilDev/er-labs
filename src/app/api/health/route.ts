import { db as erDb } from "@/er/server/db";
import { db as tarkovDb } from "@/tarkov/server/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    erDb().prepare("SELECT 1").get();
    tarkovDb().prepare("SELECT 1").get();
    return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("db", { status: 503 });
  }
}
