import type { Metadata } from "next";
import Link from "next/link";
import CreateForm from "@/components/CreateForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import OpenCode from "@/components/OpenCode";
import Bar from "@/components/t/Bar";
import { barTotal, computeGroup } from "@/lib/engine";
import { exampleView } from "@/lib/example";
import { currentUser } from "@/server/auth";
import { myTournaments } from "@/server/tournament";
import "./score.css";

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
      <Header user={user} crumb="점수 계산" next="/score" />
      <main id="main" className="wrap">
        {q.login === "failed" && (
          <p className="panel notice" role="alert">
            디스코드 로그인을 마치지 못했습니다. 다시 시도해주세요.
          </p>
        )}
        <div className="score-grid">
          <section aria-labelledby="new-h">
            <h1 className="page-h1" id="new-h">
              새 대회
            </h1>
            <CreateForm loggedIn={Boolean(user)} autoCreate={q.create === "1"} />
          </section>
          <div className="rightcol">
            <OpenCode mine={mine} />
            <section className="panel ex" aria-labelledby="ex-h">
              <div className="ex-hd">
                <b id="ex-h" className="ellipsis">{ex.name}</b>
                <span className="muted">{res.played}라운드 종료</span>
              </div>
              {top.map((s, i) => (
                <div key={s.key} className="pl">
                  <span className={`rk ${i === 0 ? "first" : ""}`}>{s.rank}</span>
                  <div>
                    <div className="ellipsis pl-nm">{s.name}</div>
                    <Bar s={s} max={max} rounds={res.played} height={10} labels={false} />
                  </div>
                  <span className="pl-tt num">{s.total.toFixed(1)}</span>
                </div>
              ))}
              <div className="ex-ft">
                <Link className="btn sm" href="/example/a">
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
