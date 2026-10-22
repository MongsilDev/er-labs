import BumpChart from "@/er/components/kel/BumpChart";
import KelPage from "@/er/components/kel/KelPage";
import { TeamName } from "@/er/components/kel/Team";
import { josa, KEL_EVENTS, KEL_TEAMS, seasonStandings } from "@/er/lib/kel";
import { kelGate, kelMetadata } from "@/er/server/kel";
import { top } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("circuits");

const CIRCUITS = KEL_EVENTS.filter((e) => /^c\d$/.test(e.key)).map((e) => e.name);

export default async function Page() {
  const { user, owner } = await kelGate("circuits");
  const season = seasonStandings();
  const riser = top(KEL_TEAMS, (t) => t.circuits[0] - t.circuits[3]);
  const [first, , , end] = riser.circuits;
  const lead = `${josa(riser.name, "은", "는")} 서킷 1에서 ${first}위였지만 서킷 4에서 ${end === 1 ? "우승했습니다" : `${end}위까지 올랐습니다`}.`;

  return (
    <KelPage user={user} owner={owner} screen="circuits" lead={lead} notes={["순위는 bori.wiki 대회 문서의 결과 표에서 가져왔습니다."]}>
      <section className="panel p-5 max-[760px]:p-4" aria-label="서킷별 순위 변화">
        <BumpChart rows={season.map((r) => ({ key: r.team.key, ranks: [...r.team.circuits] }))} labels={CIRCUITS} initial={[riser.key]} />
      </section>
      <section className="panel p-5 max-[760px]:p-4" aria-label="서킷별 최종 순위">
        <div className="overflow-x-auto">
          <table className="kel-table">
            <thead>
              <tr>
                <th className="l w-10">
                  <span className="sr-only">시즌 순위</span>
                </th>
                <th className="l">팀</th>
                {CIRCUITS.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th className="wide">시즌 포인트</th>
              </tr>
            </thead>
            <tbody>
              {season.map((r) => (
                <tr key={r.team.key}>
                  <td className="l">
                    <span className={r.rank <= 4 ? "rk adv" : "rk"}>{r.rank}</span>
                  </td>
                  <td className="l max-w-[200px]">
                    <TeamName team={r.team} />
                  </td>
                  {r.team.circuits.map((c, i) => (
                    <td key={i} className={c === 1 ? "font-bold" : undefined}>
                      {c}위
                    </td>
                  ))}
                  <td className="wide font-semibold">{r.total.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </KelPage>
  );
}
