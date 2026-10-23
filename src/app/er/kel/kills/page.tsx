import HeatCell from "@/er/components/kel/HeatCell";
import KelPage, { KelScroll, NO_DATA } from "@/er/components/kel/KelPage";
import { Logo, PlayerName, TeamName } from "@/er/components/kel/Team";
import { int } from "@/er/lib/cut";
import { byText } from "@/er/lib/format";
import { josa, seasonStandings, TEAM } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata } from "@/er/server/kel";
import { killStats, ranked } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("kills");

const TOP = 10;

export default async function Page() {
  const { user, owner } = await kelGate("kills");
  const data = kelData();
  const stats = data ? killStats(data) : null;
  if (!stats?.pairs.length) return <KelPage user={user} owner={owner} screen="kills" lead={NO_DATA} />;
  const sorted = [...stats.pairs].sort((a, b) => byText(a.killer.player, b.killer.player) || byText(a.victim.player, b.victim.player));
  const pairs = ranked(sorted, (p) => p.count, TOP);
  const teams = seasonStandings()
    .map((r) => r.team)
    .filter((t) => [...stats.together.keys()].some((k) => k.startsWith(`${t.key}|`)));
  const kills = (a: string, b: string) => stats.teams.get(`${a}|${b}`) ?? 0;
  const max = Math.max(...stats.teams.values());
  const [first] = pairs;
  const [tk, tv] = [...stats.teams].reduce((a, x) => (x[1] > a[1] ? x : a))[0].split("|");
  const lead = [
    `${TEAM.get(first.r.killer.team)!.name} ${first.r.killer.player} 선수가 ${TEAM.get(first.r.victim.team)!.name} ${first.r.victim.player} 선수를 ${first.r.count}번 잡아 같은 상대를 가장 많이 잡았습니다.`,
    `팀끼리는 ${josa(TEAM.get(tk)!.name, "이", "가")} ${josa(TEAM.get(tv)!.name, "을", "를")} ${kills(tk, tv)}번 잡아 가장 많았고, 두 팀이 같은 게임에 나온 횟수는 ${stats.together.get(`${tk}|${tv}`) ?? 0}번입니다.`,
  ];

  return (
    <KelPage
      user={user}
      owner={owner}
      screen="kills"
      lead={lead}
      notes={["두 팀이 같은 게임에 나온 횟수가 짝마다 달라서, 칸마다 그 횟수를 함께 적었습니다.", "같은 게임에 나온 적 없는 두 팀은 -로 적었습니다."]}
    >
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="top-pairs">
        <h2 id="top-pairs" className="text-[17px] font-extrabold">
          같은 상대를 많이 잡은 기록 상위 {TOP}쌍
        </h2>
        <KelScroll label={`같은 상대를 많이 잡은 기록 상위 ${TOP}쌍`} className="mt-3">
          <table className="kel-table">
            <thead>
              <tr>
                <th className="l w-10">
                  <span className="sr-only">순위</span>
                </th>
                <th className="l">잡은 선수</th>
                <th className="l wide">잡은 팀</th>
                <th className="l">잡힌 선수</th>
                <th className="l wide">잡힌 팀</th>
                <th>횟수</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map(({ r, rank }) => (
                <tr key={`${r.killer.player}|${r.victim.player}`}>
                  <td className="l">
                    <span className="rk">{rank}</span>
                  </td>
                  <td className="l max-w-[180px]">
                    <PlayerName name={r.killer.player} team={TEAM.get(r.killer.team)} />
                    <span className="narrow mt-0.5 text-[12px] text-fg-3">{TEAM.get(r.killer.team)!.name}</span>
                  </td>
                  <td className="l wide max-w-[200px]">
                    <TeamName team={TEAM.get(r.killer.team)!} size={22} />
                  </td>
                  <td className="l max-w-[180px]">
                    <PlayerName name={r.victim.player} team={TEAM.get(r.victim.team)} />
                    <span className="narrow mt-0.5 text-[12px] text-fg-3">{TEAM.get(r.victim.team)!.name}</span>
                  </td>
                  <td className="l wide max-w-[200px]">
                    <TeamName team={TEAM.get(r.victim.team)!} size={22} />
                  </td>
                  <td className="font-bold">{r.count}번</td>
                </tr>
              ))}
            </tbody>
          </table>
        </KelScroll>
      </section>
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="team-kills">
        <h2 id="team-kills" className="text-[17px] font-extrabold">
          팀끼리 잡은 횟수
        </h2>
        <p className="mt-1 text-[14px] text-fg-2">
          줄은 잡은 팀, 칸은 잡힌 팀입니다.
          <br />칸의 위 숫자는 잡은 횟수, 아래 숫자는 두 팀이 같은 게임에 나온 횟수입니다.
        </p>
        <KelScroll label="팀끼리 잡은 횟수" className="mt-3">
          <table className="kel-table kel-heat">
            <thead>
              <tr>
                <th className="l pin">잡은 팀</th>
                {teams.map((t) => (
                  <th key={t.key} className="text-center">
                    <span className="grid justify-items-center gap-1">
                      <Logo team={t} size={20} />
                      {t.short}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((a) => (
                <tr key={a.key}>
                  <td className="l pin">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Logo team={a} />
                      <span className="truncate max-[760px]:sr-only">{a.name}</span>
                      <span className="hidden max-[760px]:inline" aria-hidden>
                        {a.short}
                      </span>
                    </span>
                  </td>
                  {teams.map((b) => {
                    const n = kills(a.key, b.key);
                    const met = stats.together.get(`${a.key}|${b.key}`) ?? 0;
                    if (!met) return <HeatCell key={b.key} v={null} />;
                    return (
                      <HeatCell key={b.key} v={max ? n / max : 0}>
                        <span title={`${josa(a.name, "이", "가")} ${josa(b.name, "을", "를")} ${n}번 잡음, 같은 게임 ${met}번`}>
                          {n}
                          <span className="block text-[11px] font-normal">{met}</span>
                        </span>
                      </HeatCell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </KelScroll>
        <p className="mt-3 text-[13px] text-fg-3">
          킬 기록에는 잡힌 실험체만 남아서, 같은 게임에 같은 실험체를 고른 상대가 둘 이상이라 가릴 수 없는 킬은 빼고 {int(stats.total)}킬 중 {int(stats.counted)}킬로 셌습니다.
        </p>
      </section>
    </KelPage>
  );
}
