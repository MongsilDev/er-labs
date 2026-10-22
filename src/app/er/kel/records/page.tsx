import KelPage, { KelTabs, NO_DATA, pickTab } from "@/er/components/kel/KelPage";
import { PlayerName, TeamName } from "@/er/components/kel/Team";
import Char from "@/er/components/t/Char";
import { int } from "@/er/lib/cut";
import { josa, TEAM } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata, type KelRow } from "@/er/server/kel";
import { gameLabel, records } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("records");

const VIEWS: ["season" | "characters", string][] = [
  ["season", "시즌 전체"],
  ["characters", "실험체별"],
];

function Tile({ label, value, r, detail }: { label: string; value: string; r: KelRow; detail: string }) {
  return (
    <div className="grid content-start gap-2 rounded-lg bg-field p-4">
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="text-[30px] leading-none font-extrabold">{value}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
        <PlayerName name={r.player} />
        <Char name={r.character} />
      </p>
      <TeamName team={TEAM.get(r.team)!} size={22} />
      <p className="text-[13px] text-fg-3">
        {gameLabel(r)}, 팀 {r.placement}위, {detail}
      </p>
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { user, owner } = await kelGate("records");
  const view = pickTab(VIEWS, (await searchParams).view);
  const data = kelData();
  if (!data) return <KelPage user={user} owner={owner} screen="records" lead={NO_DATA} />;
  const rec = records(data);
  const g = rec.teamKills;
  const lead = `팀 기록으로는 ${josa(TEAM.get(g.team)!.name, "이", "가")} ${gameLabel(g)}에서 기록한 ${g.kills}킬이 가장 많습니다.`;

  return (
    <KelPage user={user} owner={owner} screen="records" lead={lead} source>
      <KelTabs screen="records" param="view" label="보기" items={VIEWS} current={view} />
      {view === "season" ? (
        <>
          <section className="grid grid-cols-4 gap-3 max-[1080px]:grid-cols-2 max-[560px]:grid-cols-1" aria-label="한 게임 최고 기록">
            <Tile label="한 게임 최다 킬" value={`${rec.kills.kills}킬`} r={rec.kills} detail={`딜량 ${int(rec.kills.damage)}`} />
            <Tile label="한 게임 최다 딜량" value={int(rec.damage[0].damage)} r={rec.damage[0]} detail={`${rec.damage[0].kills}킬`} />
            <Tile label="한 게임 최다 받은 피해" value={int(rec.taken.taken)} r={rec.taken} detail={`딜량 ${int(rec.taken.damage)}`} />
            <Tile label="7위 이하 팀에서 나온 최다 딜량" value={int(rec.lowTeamDamage.damage)} r={rec.lowTeamDamage} detail={`${rec.lowTeamDamage.kills}킬`} />
          </section>
          <section className="panel p-5 max-[760px]:p-4" aria-labelledby="top-damage">
            <h2 id="top-damage" className="text-[17px] font-extrabold">
              한 게임 딜량 상위 {rec.damage.length}개 기록
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="kel-table">
                <thead>
                  <tr>
                    <th className="l w-10">
                      <span className="sr-only">순위</span>
                    </th>
                    <th className="l">선수</th>
                    <th className="l wide">실험체</th>
                    <th className="l wide">경기</th>
                    <th>팀 순위</th>
                    <th className="wide">킬</th>
                    <th>딜량</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.damage.map((r, i) => (
                    <tr key={`${r.gameId}-${r.player}`}>
                      <td className="l">
                        <span className="rk">{i + 1}</span>
                      </td>
                      <td className="l">
                        <PlayerName name={r.player} team={TEAM.get(r.team)} />
                      </td>
                      <td className="l wide">
                        <Char name={r.character} />
                      </td>
                      <td className="l wide text-fg-2">{gameLabel(r)}</td>
                      <td>{r.placement}위</td>
                      <td className="wide">{r.kills}</td>
                      <td className="font-bold">{int(r.damage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel p-5 max-[760px]:p-4" aria-label="실험체별 한 게임 최고 기록">
          <div className="overflow-x-auto">
            <table className="kel-table">
              <thead>
                <tr>
                  <th className="l">실험체</th>
                  <th>최다 킬</th>
                  <th>최다 딜량</th>
                </tr>
              </thead>
              <tbody>
                {rec.characters.map((c) => (
                  <tr key={c.key}>
                    <td className="l">
                      <Char name={c.key} />
                    </td>
                    <td>
                      <span className="flex flex-wrap items-baseline justify-end gap-x-2">
                        <b>{c.kills.kills}킬</b>
                        <PlayerName name={c.kills.player} />
                      </span>
                    </td>
                    <td>
                      <span className="flex flex-wrap items-baseline justify-end gap-x-2">
                        <b>{int(c.damage.damage)}</b>
                        <PlayerName name={c.damage.player} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </KelPage>
  );
}
