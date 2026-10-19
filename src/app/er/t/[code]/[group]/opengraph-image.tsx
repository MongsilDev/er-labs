import { clientIp } from "@/er/server/http";
import { allow, blocked, miss } from "@/er/server/limits";
import { OG_SIZE, boardImage } from "@/er/server/og";
import { loadView } from "@/er/server/tournament";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "대회 순위표";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ code: string; group: string }> }) {
  const { code, group } = await params;
  const ip = await clientIp();
  const open = allow(`og:${ip}`, 120, 60_000) && !blocked(ip);
  const view = open ? loadView(code, null) : null;
  if (open && !view) miss(ip);
  const idx = group.length === 1 ? group.toUpperCase().charCodeAt(0) - 65 : -1;
  return boardImage(view, view && idx >= 0 && idx < view.groupCount ? idx : 0);
}
