import type { Metadata } from "next";
import Link from "next/link";
import CreateForm from "@/er/components/CreateForm";
import Footer from "@/er/components/Footer";
import Header from "@/er/components/Header";
import OpenCode from "@/er/components/OpenCode";
import Bar from "@/er/components/t/Bar";
import { barTotal, computeGroup } from "@/er/lib/engine";
import { exampleView } from "@/er/lib/example";
import { currentUser } from "@/er/server/auth";
import { myTournaments } from "@/er/server/tournament";
import Lines from "@/er/components/Lines";

export const metadata: Metadata = {
  title: "점수 계산",
  description: "이터널 리턴 커스텀 게임 결과 CSV로 커뮤니티 대회 순위, 감점, 체크포인트, 금지 실험체를 계산합니다.",
};
export const dynamic = "force-dynamic";

export default async function ScorePage({ searchParams }: { searchParams: Promise<{ create?: string; login?: string }> }) {
  const q = await searchParams;
  const user = await currentUser();
  const mine = user ? myTournaments(user) : [];
  const ex = exampleView();
  const g = ex.groups[0];
  const res = computeGroup({
    mode: ex.mode,
    rules: ex.rules,
    plannedRounds: ex.plannedRounds,
    rounds: g.rounds,
    penalties: g.penalties,
    weather: g.weather,
    aliases: g.aliases,
    overrides: g.overrides,
  });
  const top = res.standings.slice(0, 4);
  const max = Math.max(1, ...res.standings.map(barTotal));
  return (
    <>
      <Header user={user} crumb="점수 계산" next="/er/score" />
      <main id="main" className="wrap">
        {q.login === "failed" && (
          <p className="panel mb-4 border-minus px-4 py-3" role="alert">
            <Lines text="디스코드 로그인을 마치지 못했습니다. 다시 시도해주세요." />
          </p>
        )}
        <div className="grid grid-cols-[minmax(0,460px)_minmax(0,1fr)] items-start gap-10 max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:gap-6">
          <section aria-labelledby="new-h">
            <h1 className="mt-3 mb-[18px] text-[28px] font-extrabold tracking-[-0.5px]" id="new-h">
              새 대회
            </h1>
            <CreateForm loggedIn={Boolean(user)} autoCreate={q.create === "1"} />
          </section>
          <div className="mt-[72px] grid grid-cols-[minmax(0,1fr)] gap-4 max-[900px]:contents">
            <OpenCode mine={mine} />
            <section className="panel px-5 py-[18px]" aria-labelledby="ex-h">
              <div className="mb-1.5 flex items-center gap-2">
                <b id="ex-h" className="min-w-0 truncate text-[15px]">{ex.name}</b>
                <span className="ml-auto text-[13px] text-fg-3">{res.played}라운드 종료</span>
              </div>
              {top.map((s, i) => (
                <div key={s.key} className="grid grid-cols-[34px_minmax(0,1fr)_60px] items-center gap-2.5 border-t border-line-soft py-[9px]">
                  <span className={`rk ${i === 0 ? "first" : ""}`}>{s.rank}</span>
                  <div>
                    <div className="mb-[5px] min-w-0 truncate text-[14px] font-bold">{s.name}</div>
                    <Bar s={s} max={max} rounds={res.played} height={10} labels={false} />
                  </div>
                  <span className="text-right text-[18px] font-extrabold tabular-nums">{s.total.toFixed(1)}</span>
                </div>
              ))}
              <div className="mt-3 flex justify-end">
                <Link className="btn sm" href="/er/example/a">
                  예시 대회 열기
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
