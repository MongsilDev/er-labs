import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import TournamentApp from "@/components/t/TournamentApp";
import { currentUser } from "@/server/auth";
import { clientIp } from "@/server/http";
import { allow, blocked, miss } from "@/server/limits";
import { summary } from "@/server/og";
import { loadView } from "@/server/tournament";

type P = { params: Promise<{ code: string; group: string }>; searchParams?: Promise<{ created?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { code, group } = await params;
  const view = loadView(code, null);
  if (!view) return { title: "없는 대회", robots: { index: false } };
  const idx = group.length === 1 ? group.toUpperCase().charCodeAt(0) - 65 : 0;
  const description = summary(view, idx >= 0 && idx < view.groupCount ? idx : 0);
  return { title: view.name, description, openGraph: { title: view.name, description, siteName: "ER Labs", type: "website", locale: "ko_KR" }, robots: { index: false } };
}

export default async function Page({ params, searchParams }: P) {
  const { code, group } = await params;
  const q = (await searchParams) ?? {};
  const upper = code.toUpperCase();
  if (upper !== code) redirect(`/t/${upper}/${group.toLowerCase()}`);
  const ip = await clientIp();
  if (blocked(ip) || !allow(`page:${ip}`, 300, 60_000)) {
    return (
      <main id="main" className="wrap slim">
        <section className="panel mt-6 grid justify-items-start gap-2.5 p-7">
          <h1 className="text-[22px]">요청이 너무 많습니다</h1>
          <p className="text-fg-3">잠시 뒤 다시 열어주세요.</p>
        </section>
      </main>
    );
  }
  const user = await currentUser();
  const view = loadView(code, user);
  if (!view) {
    miss(ip);
    notFound();
  }
  const idx = group.toLowerCase().charCodeAt(0) - 97;
  if (group.length !== 1 || idx < 0 || idx >= view.groupCount) redirect(`/t/${view.code}/a`);
  return (
    <>
      <Header user={user} crumb="점수 계산" wide next={`/t/${view.code}/${group}`} />
      <TournamentApp initial={view} groupIdx={idx} basePath={`/t/${view.code}`} created={q.created === "1"} />
      <Footer wide />
    </>
  );
}
