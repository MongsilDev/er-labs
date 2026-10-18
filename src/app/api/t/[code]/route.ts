import type { NextRequest } from "next/server";
import { currentUser } from "@/server/auth";
import { allow } from "@/server/limits";
import { applyOp, deleteTournament, loadView, tournamentVersion } from "@/server/tournament";
import { clientIp, fail, guardWrite, handle, json } from "@/server/http";
import type { Op } from "@/lib/view";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const { code } = await ctx.params;
    const ip = await clientIp();
    if (!allow(`get:${ip}`, 240, 60_000)) return fail("요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.", 429);
    const since = Number(req.nextUrl.searchParams.get("since"));
    if (since) {
      const v = tournamentVersion(code);
      if (v === null) {
        if (!allow(`miss:${ip}`, 30, 60_000)) return fail("요청이 너무 많습니다.", 429);
        return fail("없거나 지워진 대회입니다.", 404);
      }
      if (v === since) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    const view = loadView(code, await currentUser());
    if (!view) {
      if (!allow(`miss:${ip}`, 30, 60_000)) return fail("요청이 너무 많습니다.", 429);
      return fail("없거나 지워진 대회입니다.", 404);
    }
    return json(view);
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    const { code } = await ctx.params;
    const op = (await req.json()) as Op;
    return json(applyOp(code, g.user, op));
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    const { code } = await ctx.params;
    const body = (await req.json()) as { confirm?: string };
    deleteTournament(code, g.user, body.confirm ?? "");
    return json({ ok: true });
  });
}
