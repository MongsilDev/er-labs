import { pickMode } from "@/lib/modes";
import { toSample } from "@/lib/sample";
import { verdict } from "@/server/baseline";
import { isHidden } from "@/server/db";
import { OG_SIZE, profileImage } from "@/server/og";
import { account, load } from "@/server/profiles";

export const alt = "계정 전적";
export const size = OG_SIZE;
export const contentType = "image/png";

// 미리보기 이미지는 쿼리를 받지 못해 가장 최근 갱신된 모드를 씀
export default async function Image({ params }: { params: Promise<{ aid: string }> }) {
  const raw = (await params).aid;
  const n = /^\d{1,10}$/.test(raw) ? Number(raw) : 0;
  const aid = n && !isHidden(n) ? n : 0;
  const acc = aid ? account(aid) : null;
  const mode = pickMode(acc?.modes ?? null);
  const res = aid ? await load(mode, aid) : null;
  const s = res?.summary ?? null;
  const v = s ? verdict(mode, aid, toSample(s)) : null;
  return profileImage(s?.name || acc?.name || `#${raw}`, mode, s, v);
}
