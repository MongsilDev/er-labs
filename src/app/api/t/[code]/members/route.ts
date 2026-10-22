import type { NextRequest } from "next/server";
import { currentUser } from "@/er/server/auth";
import { allow, blocked, miss } from "@/er/server/limits";
import { cancelInvite, createInvite, members, OpError, removeMember, transferOwner } from "@/er/server/tournament";
import { clientIp, fail, guardWrite, handle, json, readJson } from "@/er/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return fail("디스코드로 로그인해주세요.", 401);
    const { code } = await ctx.params;
    const ip = await clientIp();
    if (!allow(`members:${ip}`, 600, 60_000) || blocked(ip)) return fail("요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.", 429);
    try {
      return json(members(code, user));
    } catch (e) {
      if (e instanceof OpError) miss(ip);
      throw e;
    }
  });
}

type Body = { action: "invite" | "cancel" | "remove" | "transfer" | "leave"; token?: string; user?: string; uses?: number };

export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    const { code } = await ctx.params;
    const body = await readJson<Body>(req);
    switch (body.action) {
      case "invite":
        return json({ token: createInvite(code, g.user, body.uses ?? 1) });
      case "cancel":
        cancelInvite(code, g.user, String(body.token ?? ""));
        break;
      case "remove":
        removeMember(code, g.user, String(body.user ?? ""));
        break;
      case "leave":
        removeMember(code, g.user, g.user.id);
        break;
      case "transfer":
        transferOwner(code, g.user, String(body.user ?? ""));
        break;
      default:
        return fail("알 수 없는 요청입니다.");
    }
    return json({ ok: true });
  });
}
