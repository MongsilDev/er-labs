import { modeOf } from "@/lib/modes";
import { clientIp, fail, handle, json, sameOrigin } from "@/server/http";
import { allow } from "@/server/limits";
import { load } from "@/server/profiles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ aid: string }> };

export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    if (!(await sameOrigin())) return fail("다른 사이트에서 보낸 요청은 받지 않습니다.", 403);
    if (!allow(`r:${await clientIp()}`, 10, 60_000)) return fail("다시 불러오기는 1분에 10번까지 됩니다.", 429);
    const aid = Number((await ctx.params).aid);
    const mode = modeOf(new URL(req.url).searchParams.get("mode"));
    if (!Number.isSafeInteger(aid) || aid <= 0 || !mode) return fail("잘못된 주소입니다.", 400);
    const r = await load(mode, aid, true);
    if (r.error) return fail("tarkov.dev에서 받아오지 못했습니다. 잠시 뒤 다시 시도해주세요.", 502);
    return json({ updated: r.summary?.updated ?? null });
  });
}
