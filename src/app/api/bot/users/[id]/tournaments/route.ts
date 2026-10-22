import type { NextRequest } from "next/server";
import { botAuthorized, botTournaments } from "@/er/server/board";
import { fail, handle, json } from "@/er/server/http";
import { allow } from "@/er/server/limits";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    if (!botAuthorized(req.headers.get("x-bot-token"))) return new Response(null, { status: 404 });
    if (!allow("bot", 1200, 60_000)) return fail("요청이 너무 많습니다.", 429);
    const { id } = await ctx.params;
    return json(botTournaments(id));
  });
}
