import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Overlay from "@/er/components/Overlay";
import { loadView } from "@/er/server/tournament";

export const metadata: Metadata = { title: "방송 화면", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ code: string; group: string }>; searchParams: Promise<{ top?: string; scale?: string; side?: string }> }) {
  const { code, group } = await params;
  const q = await searchParams;
  const view = loadView(code, null);
  if (!view) notFound();
  const idx = group.toLowerCase().charCodeAt(0) - 97;
  if (group.length !== 1 || idx < 0 || idx >= view.groupCount) notFound();
  return (
    <>
      <style>{"html,body{background:transparent!important}"}</style>
      <Overlay
        initial={view}
        groupIdx={idx}
        limit={Math.max(1, Math.min(24, Number(q.top) || 24))}
        scale={Math.max(0.5, Math.min(3, Number(q.scale) || 1))}
        side={q.side === "left" ? "left" : "right"}
      />
    </>
  );
}
