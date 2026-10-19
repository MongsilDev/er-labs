import { pickMode } from "@/tarkov/lib/modes";
import { toSample } from "@/tarkov/lib/sample";
import { verdict } from "@/tarkov/server/baseline";
import { isHidden } from "@/tarkov/server/db";
import { profileImage } from "@/tarkov/server/og";
import { account, displayName, load } from "@/tarkov/server/profiles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ aid: string }> };

// opengraph-image 파일 규칙은 쿼리를 받지 못해 모드별 미리보기를 라우트로 만듦
export async function GET(req: Request, ctx: Ctx) {
  const raw = (await ctx.params).aid;
  const n = /^\d{1,10}$/.test(raw) ? Number(raw) : 0;
  const aid = n && !isHidden(n) ? n : 0;
  const acc = aid ? account(aid) : null;
  const mode = pickMode(acc?.modes ?? null, new URL(req.url).searchParams.get("mode"));
  const res = aid ? await load(mode, aid) : null;
  const s = res?.summary ?? null;
  const v = s ? verdict(mode, aid, toSample(s)) : null;
  const img = await profileImage(aid ? displayName(aid, acc, s) : `#${raw}`, mode, s, v);
  img.headers.set("Cache-Control", "public, max-age=600");
  return img;
}
