import { openView } from "@/er/server/http";
import { OG_SIZE, boardImage } from "@/er/server/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "대회 순위표";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ code: string; group: string }> }) {
  const { code, group } = await params;
  const { view } = await openView(code, null, "og", 120);
  const idx = group.length === 1 ? group.toUpperCase().charCodeAt(0) - 65 : -1;
  return boardImage(view, view && idx >= 0 && idx < view.groupCount ? idx : 0);
}
