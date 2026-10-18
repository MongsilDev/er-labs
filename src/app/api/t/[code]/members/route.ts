import type { NextRequest } from "next/server";
import { currentUser } from "@/server/auth";
import { cancelInvite, createInvite, members, removeMember, transferOwner } from "@/server/tournament";
import { fail, guardWrite, handle, json } from "@/server/http";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return fail("디스코드로 로그인해주세요.", 401);
    const { code } = await ctx.params;
    return json(members(code, user));
  });
}

type Body = { action: "invite" | "cancel" | "remove" | "transfer" | "leave"; token?: string; user?: string };

export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    const { code } = await ctx.params;
    const body = (await req.json()) as Body;
    switch (body.action) {
      case "invite":
        return json({ token: createInvite(code, g.user) });
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
