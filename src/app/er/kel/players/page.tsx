import Link from "next/link";
import KelPage, { NO_DATA } from "@/er/components/kel/KelPage";
import { Logo } from "@/er/components/kel/Team";
import Char from "@/er/components/t/Char";
import { int } from "@/er/lib/cut";
import { pct } from "@/er/lib/format";
import { playerPath, seasonStandings, TEAM, wikiUrl } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { gameLabel, MIN_GAMES, playerStats, rankOf, type Metric, type PlayerStat } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("players");

// 하위 순위를 보여주지 않는 정책의 순위 표시 상한
const SHOW_RANK = 10;

const TILES: [Metric, string, (p: PlayerStat) => string][] = [
  ["kpr", "KPR", (p) => p.kpr.toFixed(3)],
  ["kills", "게임당 킬", (p) => p.kills.toFixed(2)],
  ["top3", "3위 이내 비율", (p) => pct(p.top3)],
  ["avgPlace", "평균 순위", (p) => `${p.avgPlace.toFixed(2)}위`],
  ["damage", "게임당 가한 피해", (p) => int(p.damage)],
  ["damageShare", "가한 피해 비중", (p) => pct(p.damageShare)],
];

function Card({ p, all, eligible }: { p: PlayerStat; all: PlayerStat[]; eligible: number }) {
  const team = TEAM.get(p.team)!;
  return (
    <section className="panel grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 p-6 max-[860px]:grid-cols-1 max-[760px]:p-4" aria-labelledby="player">
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          <Logo team={team} size={56} />
          <div className="min-w-0">
            <a className="inline-block py-1 text-[14px] text-fg-2 decoration-line-strong underline-offset-[3px] hover:decoration-fg-3" href={wikiUrl(team.wiki)}>
              {team.name}
            </a>
            <h2 id="player" className="truncate text-[34px] leading-tight font-extrabold tracking-[-0.5px] max-[760px]:text-[28px]">
              <a className="decoration-line-strong underline-offset-[5px] hover:decoration-fg-3" href={wikiUrl(p.name)}>
                {p.name}
              </a>
            </h2>
          </div>
        </div>
        <p className="mt-4 text-fg-2">
          2026 시즌 {p.games}게임에 나와 1위를 {p.wins}번 했습니다.
        </p>
        <h3 className="mt-5 text-[13px] font-semibold text-fg-3">많이 고른 실험체</h3>
        <ul className="mt-2 grid gap-2">
          {p.characters.slice(0, 4).map(([c, n]) => (
            <li key={c} className="flex items-center justify-between gap-3 text-[15px]">
              <Char name={c} />
              <span className="text-fg-3">{n}게임</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-soft pt-3 text-[14px]">
          <span className="text-fg-3">한 게임 최다 킬</span>
          <b>{p.best.kills}킬</b>
          <Char name={p.best.character} />
          <span className="text-fg-3">{gameLabel(p.best)}</span>
        </p>
      </div>
      <dl className="grid grid-cols-2 content-start gap-3 max-[420px]:gap-2">
        {TILES.map(([m, label, value]) => {
          const rank = rankOf(all, p, m);
          return (
            <div key={m} className="rounded-lg bg-field px-4 py-3.5 max-[420px]:px-3">
              <dt className="text-[13px] text-fg-3">{label}</dt>
              <dd className="mt-1 text-[26px] leading-tight font-extrabold max-[420px]:text-[22px]">{value(p)}</dd>
              {rank !== null && rank <= SHOW_RANK && (
                <dd className="mt-0.5 text-[13px] font-semibold text-accent-text">
                  {eligible}명 중 {rank}위
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { user, owner } = await kelGate("players");
  const q = await searchParams;
  const data = kelData();
  const all = data ? playerStats(data) : [];
  if (!all.length) return <KelPage user={user} owner={owner} screen="players" lead={NO_DATA} />;
  const eligible = all.filter((p) => p.games >= MIN_GAMES).length;
  const byTeam = seasonStandings()
    .map((r) => ({ team: r.team, players: all.filter((p) => p.team === r.team.key).sort((a, b) => b.games - a.games) }))
    .filter((t) => t.players.length);
  const picked = q.p === undefined ? byTeam[0].players[0] : all.find((p) => p.name === q.p);

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="players"
      notes={[
        `순위는 ${MIN_GAMES}게임 이상 나온 선수 ${eligible}명끼리 비교했고, ${SHOW_RANK}위 안에 든 지표에만 표시했습니다.`,
        "KPR은 경기 기록에 게임마다 적힌 선수 평점을 평균한 값이고, 한 게임의 평균은 약 1.0입니다.",
        "가한 피해 비중은 게임마다 팀 세 명이 가한 피해 합계에서 그 선수가 차지한 비율을 평균한 값입니다.",
      ]}
    >
      {picked && <Card p={picked} all={all} eligible={eligible} />}
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="player-list">
        <h2 id="player-list" className="text-[17px] font-extrabold">
          선수 {all.length}명
        </h2>
        <ul className="mt-3 columns-2 gap-x-6 max-[760px]:columns-1">
          {byTeam.map(({ team, players }) => (
            <li key={team.key} className="mb-3 flex min-w-0 break-inside-avoid items-start gap-3">
              <Logo team={team} size={28} label />
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {players.map((p) => (
                  <Link
                    key={p.name}
                    href={playerPath(p.name)}
                    aria-current={p.name === picked?.name ? "page" : undefined}
                    className="chip h-7 no-underline hover:border-line-strong aria-[current=page]:border-accent aria-[current=page]:text-accent-text"
                  >
                    {p.name}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </KelPage>
  );
}
