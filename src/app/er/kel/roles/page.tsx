import KelPage, { NO_DATA } from "@/er/components/kel/KelPage";
import Scatter from "@/er/components/kel/Scatter";
import { PlayerName } from "@/er/components/kel/Team";
import Char from "@/er/components/t/Char";
import { pct } from "@/er/lib/format";
import { josa, seasonStandings, TEAM, TONES } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { MIN_GAMES, playerStats, type PlayerStat } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("roles");

const TOP = 5;

function Top({ id, title, rows, value }: { id: string; title: string; rows: PlayerStat[]; value: (p: PlayerStat) => number }) {
  return (
    <section className="panel p-5 max-[760px]:p-4" aria-labelledby={id}>
      <h2 id={id} className="text-[17px] font-extrabold">
        {title}
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="kel-table">
          <thead>
            <tr>
              <th className="l">선수</th>
              <th className="l wide">많이 고른 실험체</th>
              <th>비중</th>
              <th>게임</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name}>
                <td className="l max-w-[180px]">
                  <PlayerName name={p.name} team={TEAM.get(p.team)} />
                </td>
                <td className="l wide">
                  <Char name={p.characters[0][0]} />
                </td>
                <td className="font-bold">{pct(value(p))}</td>
                <td className="text-fg-3">{p.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function Page() {
  const { user, owner } = await kelGate("roles");
  const data = kelData();
  const players = data ? playerStats(data).filter((p) => p.games >= MIN_GAMES) : [];
  if (!players.length) return <KelPage user={user} owner={owner} screen="roles" lead={NO_DATA} />;
  const taken = [...players].sort((a, b) => b.takenShare - a.takenShare).slice(0, TOP);
  const damage = [...players].sort((a, b) => b.damageShare - a.damageShare).slice(0, TOP);
  const tone = (p: PlayerStat) => (damage.includes(p) ? 0 : taken.includes(p) ? 1 : undefined);
  const lead = `팀 딜량과 받은 피해를 세 명이 똑같이 나누면 한 사람의 몫은 33.3%입니다. 받은 피해 비중은 ${josa(taken[0].name, "이", "가")} ${pct(taken[0].takenShare)}로 1위이고, 딜량 비중은 ${josa(damage[0].name, "이", "가")} ${pct(damage[0].damageShare)}로 1위입니다.`;
  const order = seasonStandings().map((r) => r.team.key);
  const all = [...players].sort((a, b) => order.indexOf(a.team) - order.indexOf(b.team) || b.games - a.games);

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="roles"
      lead={lead}
      notes={[
        "포지션이 고정되지 않아 같은 선수도 게임마다 맡은 역할이 바뀔 수 있습니다.",
        `${MIN_GAMES}게임 이상 나온 선수 ${players.length}명만 넣었습니다.`,
        "비중은 게임마다 팀 세 명의 합계에서 차지한 비율을 평균한 값입니다.",
      ]}
      source
    >
      <div className="grid grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-start gap-5 max-[1080px]:grid-cols-1">
        <section className="panel p-5 max-[760px]:p-4 min-[1081px]:sticky min-[1081px]:top-6" aria-label="팀 딜량과 받은 피해에서 차지한 비중">
          <span className="legend">
            <span>
              <i style={{ background: TONES[0], width: 10, borderRadius: 999 }} />
              딜량 비중 상위 {TOP}명
            </span>
            <span>
              <i style={{ background: TONES[1], width: 10, borderRadius: 999 }} />
              받은 피해 비중 상위 {TOP}명
            </span>
          </span>
          <div className="mt-3">
            <Scatter
              points={players.map((p) => ({
                key: p.name,
                x: p.damageShare,
                y: p.takenShare,
                name: p.name,
                tone: tone(p),
                info: [TEAM.get(p.team)!.name, `딜량 비중 ${pct(p.damageShare)}`, `받은 피해 비중 ${pct(p.takenShare)}`, `${p.games}게임`],
              }))}
              xLabel="팀 딜량 중 비중"
              yLabel="팀 받은 피해 중 비중"
              format="pct"
              refX={1 / 3}
              refY={1 / 3}
            />
          </div>
          <details className="mt-3 text-[14px]">
            <summary className="cursor-pointer text-fg-2">선수 {players.length}명 표</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="kel-table">
                <thead>
                  <tr>
                    <th className="l">선수</th>
                    <th>딜량 비중</th>
                    <th>받은 피해 비중</th>
                    <th>게임</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((p) => (
                    <tr key={p.name}>
                      <td className="l max-w-[180px]">
                        <PlayerName name={p.name} team={TEAM.get(p.team)} />
                      </td>
                      <td>{pct(p.damageShare)}</td>
                      <td>{pct(p.takenShare)}</td>
                      <td className="text-fg-3">{p.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <div className="grid gap-5">
          <Top id="top-taken" title={`받은 피해 비중 상위 ${TOP}명`} rows={taken} value={(p) => p.takenShare} />
          <Top id="top-damage" title={`딜량 비중 상위 ${TOP}명`} rows={damage} value={(p) => p.damageShare} />
        </div>
      </div>
    </KelPage>
  );
}
