import KelPage, { KelScroll, NO_DATA } from "@/er/components/kel/KelPage";
import { Logo } from "@/er/components/kel/Team";
import Char from "@/er/components/t/Char";
import { characterName } from "@/er/lib/format";
import { josa, TEAM } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { comps } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("comps");

const MIN = 8;

export default async function Page() {
  const { user, owner } = await kelGate("comps");
  const data = kelData();
  const rows = data ? comps(data, MIN) : [];
  if (!rows.length) return <KelPage user={user} owner={owner} screen="comps" lead={NO_DATA} />;
  const first = rows[0];
  const [team, times] = first.teams[0];
  const lead = [
    `${first.characters.map(characterName).join(", ")} 조합은 ${first.count}번 나왔고, 평균 순위는 ${first.avgPlace.toFixed(2)}위였습니다.`,
    `그중 ${times}번은 ${josa(TEAM.get(team)!.name, "이", "가")} 고른 조합입니다.`,
  ];

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="comps"
      lead={lead}
      notes={[
        `표에는 ${MIN}번 이상 나온 ${rows.length}개 조합을 넣었습니다.`,
        "대회마다 게임 수가 다르고 실험체를 쓸 수 있는 횟수에 제한이 있어서, 한 팀이 자주 쓴 조합이 표 위쪽에 놓일 수 있습니다.",
      ]}
      source
    >
      <section className="panel p-5 max-[760px]:p-4">
        <KelScroll label="자주 나온 3인 조합">
          <table className="kel-table">
            <thead>
              <tr>
                <th className="l">조합</th>
                <th>횟수</th>
                <th>평균 순위</th>
                <th>1위</th>
                <th className="l wide">많이 고른 팀</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.characters.join("|")}>
                  <td className="l">
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      {r.characters.map((c) => (
                        <Char key={c} name={c} />
                      ))}
                    </span>
                  </td>
                  <td>{r.count}</td>
                  <td className="font-bold">{r.avgPlace.toFixed(2)}위</td>
                  <td>{r.wins}</td>
                  <td className="l wide">
                    <span className="flex gap-3">
                      {r.teams.filter(([, n], i) => i < 3 || n === r.teams[2][1]).map(([k, n]) => (
                        <span key={k} className="inline-flex items-center gap-1.5 text-fg-2">
                          <Logo team={TEAM.get(k)!} size={22} label />
                          {n}번
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </KelScroll>
      </section>
    </KelPage>
  );
}
