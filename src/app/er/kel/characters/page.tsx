import HeatCell from "@/er/components/kel/HeatCell";
import KelPage, { KelScroll, KelTabs, NO_DATA, pickTab } from "@/er/components/kel/KelPage";
import Char from "@/er/components/t/Char";
import { characterName, pct } from "@/er/lib/format";
import { josa, KEL_EVENTS } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { characterStats, top, type CharacterStat } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("characters");

type Sort = "picks" | "place" | "rise";

const SORTS: [Sort, string][] = [
  ["picks", "많이 나온 순"],
  ["place", "평균 순위 순"],
  ["rise", "서킷 4에서 오른 순"],
];

const SORT: Record<Sort, (a: CharacterStat, b: CharacterStat) => number> = {
  picks: (a, b) => b.rate - a.rate,
  place: (a, b) => a.avgPlace - b.avgPlace,
  rise: (a, b) => b.byEvent.c4 - b.byEvent.c3 - (a.byEvent.c4 - a.byEvent.c3),
};

export default async function Page({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { user, owner } = await kelGate("characters");
  const sort = pickTab(SORTS, (await searchParams).sort);
  const data = kelData();
  if (!data) return <KelPage user={user} owner={owner} screen="characters" lead={NO_DATA} />;
  const { total, eventGames, rows } = characterStats(data);
  const min = Math.ceil(total * 0.1);
  const shown = rows.filter((r) => r.games >= min).sort(SORT[sort]);
  const events = KEL_EVENTS.filter((e) => eventGames[e.key] > 0);
  const swings = shown.map((r) => {
    const rates = events.map((e, i) => ({ e, i, v: r.byEvent[e.key] }));
    const lo = top(rates, (x) => -x.v);
    const hi = top(rates, (x) => x.v);
    return { r, from: lo.i < hi.i ? lo : hi, to: lo.i < hi.i ? hi : lo, gap: hi.v - lo.v };
  });
  const swing = swings.length ? top(swings, (x) => x.gap) : null;
  const seen = (v: number) => (v ? `${pct(v, 0)}의 게임에 나왔` : "한 번도 나오지 않았");
  const lead = [
    swing &&
      swing.gap > 0 &&
      `${josa(characterName(swing.r.key), "은", "는")} ${swing.from.e.name}에서 ${seen(swing.from.v)}고, ${swing.to.e.name}에서는 ${seen(swing.to.v)}습니다.`,
    `2026 시즌에는 실험체 ${rows.length}종이 한 번 이상 나왔습니다.`,
  ];
  const sizes = events.map((e) => eventGames[e.key]);

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="characters"
      lead={lead}
      notes={[
        "칸의 숫자는 그 대회 게임 가운데 한 팀이라도 그 실험체를 고른 게임이 차지하는 비율입니다.",
        `시즌 게임의 10%인 ${min}게임 이상 나온 ${shown.length}종만 넣었습니다.`,
        `대회마다 게임 수가 ${Math.min(...sizes)}~${Math.max(...sizes)}게임이라, 한 팀의 선택이 비율을 크게 바꿀 수 있습니다.`,
        "서킷 1 결승을 빼면 모든 경기에서 한 팀은 같은 실험체를 매치마다 2번까지만 쓸 수 있습니다.",
        "평균 순위와 1위 비율은 그 실험체를 고른 선수의 팀 순위로 셉니다.",
      ]}
      source
    >
      <KelTabs screen="characters" param="sort" label="정렬" items={SORTS} current={sort} />
      <section className="panel p-5 max-[760px]:p-4">
        <KelScroll label="대회별 실험체 등장률">
          <table className="kel-table kel-heat">
            <thead>
              <tr>
                <th className="l pin">실험체</th>
                <th className="narrow">시즌 전체</th>
                {events.map((e) => (
                  <th key={e.key} className="text-center">
                    {e.name}
                    <span className="block font-normal">{eventGames[e.key]}게임</span>
                  </th>
                ))}
                <th className="wide">시즌 전체</th>
                <th>평균 순위</th>
                <th>1위 비율</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key}>
                  <td className="l pin">
                    <Char name={r.key} />
                  </td>
                  <td className="narrow font-bold">{pct(r.rate, 0)}</td>
                  {events.map((e) => (
                    <HeatCell key={e.key} v={r.byEvent[e.key]}>
                      {pct(r.byEvent[e.key], 0)}
                    </HeatCell>
                  ))}
                  <td className="wide font-bold">{pct(r.rate, 0)}</td>
                  <td>{r.avgPlace.toFixed(2)}위</td>
                  <td>{pct(r.winRate, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </KelScroll>
      </section>
    </KelPage>
  );
}
