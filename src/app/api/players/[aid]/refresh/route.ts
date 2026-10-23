import { modeOf } from "@/tarkov/lib/modes";
import { fail, handle, json, sameOrigin } from "@/tarkov/server/http";
import { allow, clientIp } from "@/limits";
import { load } from "@/tarkov/server/profiles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ aid: string }> };

export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    if (!(await sameOrigin())) return fail("다른 사이트에서 보낸 요청은 받지 않습니다.", 403);
    const ip = await clientIp();
    if (!allow(`r:${ip}`, 10, 60_000)) return fail("다시 불러오기는 1분에 10번까지 할 수 있습니다.", 429);
    const aid = Number((await ctx.params).aid);
    const mode = modeOf(new URL(req.url).searchParams.get("mode"));
    if (!Number.isSafeInteger(aid) || aid <= 0 || !mode) return fail("잘못된 주소입니다. 화면을 새로고침한 뒤 다시 시도해주세요.", 400);
    const r = await load(mode, aid, true, ip);
    if (r.limited) return fail("요청이 많아 tarkov.dev에서 기록을 새로 받지 못했습니다. 잠시 뒤 다시 시도해주세요.", 429);
    if (r.error) return fail("tarkov.dev에서 기록을 받아오지 못했습니다. 잠시 뒤 다시 시도해주세요.", 502);
    return json({ updated: r.summary?.updated ?? null });
  });
}
