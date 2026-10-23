import KelPage, { KelScroll, KelTabs, NO_DATA, pickTab } from "@/er/components/kel/KelPage";
import Scatter from "@/er/components/kel/Scatter";
import { TeamName } from "@/er/components/kel/Team";
import { pct } from "@/er/lib/format";
import { josa, TEAM } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { teamStyles, top, type StyleScope } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("teams");

const SCOPES: [StyleScope, string][] = [
  ["season", "시즌 전체"],
  ["c4", "서킷 4"],
  ["finals", "결승"],
];

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { user, owner } = await kelGate("teams");
  const scope = pickTab(SCOPES, (await searchParams).s);
  const data = kelData();
  const rows = data ? teamStyles(data, scope) : [];
  if (!rows.length) return <KelPage user={user} owner={owner} screen="teams" lead={NO_DATA} />;
  const wins = top(
    rows,
    (r) => r.wins,
    (r) => r.perGame,
  );
  const kills = top(rows, (r) => r.killShare);
  const name = (k: string) => TEAM.get(k)!.name;
  const lead = [
    `${josa(name(wins.team), "은", "는")} ${wins.games}게임 가운데 ${wins.wins}게임에서 1위를 해 가장 많이 이겼습니다.`,
    kills.team !== wins.team && `킬 점수 비중은 ${josa(name(kills.team), "이", "가")} ${pct(kills.killShare)}로 가장 높았습니다.`,
  ];

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="teams"
      lead={lead}
      notes="점수는 모두 게임당 평균이고, 감점은 넣지 않았습니다."
      source
    >
      <KelTabs screen="teams" param="s" label="범위" items={SCOPES} current={scope} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-5 max-[1080px]:grid-cols-1">
        <section className="panel p-5 max-[760px]:p-4 min-[1081px]:sticky min-[1081px]:top-6" aria-label="게임당 순위 점수와 킬 점수">
          <Scatter
            key={scope}
            points={rows.map((r) => ({
              key: r.team,
              x: r.rankPerGame,
              y: r.killPerGame,
              name: name(r.team),
              team: r.team,
              info: [`${r.games}게임, 1위 ${r.wins}번`, `게임당 순위 점수 ${r.rankPerGame.toFixed(2)}`, `게임당 킬 점수 ${r.killPerGame.toFixed(2)}`],
            }))}
            xLabel="게임당 순위 점수"
            yLabel="게임당 킬 점수"
            format="num"
          />
        </section>
        <section className="panel p-5 max-[760px]:p-4">
          <KelScroll label="팀별 기록">
            <table className="kel-table">
              <thead>
                <tr>
                  <th className="l pin">팀</th>
                  <th>게임</th>
                  <th>1위</th>
                  <th className="wide">3위 이내</th>
                  <th>킬 점수 비중</th>
                  <th className="wide">순위 점수</th>
                  <th className="wide">킬 점수</th>
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.team}>
                    <td className="l pin max-w-[180px]">
                      <TeamName team={TEAM.get(r.team)!} />
                    </td>
                    <td>{r.games}</td>
                    <td>{r.wins}</td>
                    <td className="wide">{pct(r.top3)}</td>
                    <td>{pct(r.killShare)}</td>
                    <td className="wide">{r.rankPerGame.toFixed(2)}</td>
                    <td className="wide">{r.killPerGame.toFixed(2)}</td>
                    <td className="font-bold">{r.perGame.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KelScroll>
        </section>
      </div>
    </KelPage>
  );
}
