import { barTotal, type GroupResult } from "@/lib/engine";
import { fmt, fmt1 } from "@/lib/format";
import type { Mode, Rules } from "@/lib/rules";
import Bar, { Legend } from "./Bar";

const TIE: Record<string, string> = {
  killScore: "킬 점수로 가름",
  kills: "킬 수로 가름",
  rankScore: "순위 점수로 가름",
  wins: "1위 횟수로 가름",
  lastPlacement: "마지막 라운드 순위로 가름",
};

export function Delta({ d }: { d: number }) {
  if (d > 0) return <span className="up" aria-label={`${d}계단 상승`}>▲{d}</span>;
  if (d < 0) return <span className="down" aria-label={`${-d}계단 하락`}>▼{-d}</span>;
  return null;
}

export default function Standings({ result, rules, mode, label }: { result: GroupResult; rules: Rules; mode: Mode; label: string }) {
  const { standings, played } = result;
  const max = Math.max(1, ...standings.map(barTotal));
  const advance = rules.advance;
  const killLabel = rules.tiebreak === "kills" ? "킬" : "킬 점수";
  const anyPenalty = standings.some((s) => s.penalty > 0);
  const ties = Object.entries(
    standings.reduce<Record<string, string[]>>((acc, s) => {
      if (s.tiedBy) (acc[s.tiedBy] ??= []).push(s.name);
      return acc;
    }, {}),
  );
  if (standings.length === 0) {
    return (
      <section className="panel stand-empty" aria-label={`${label} 순위표`}>
        <p className="muted">아직 올라온 경기 결과가 없습니다.</p>
      </section>
    );
  }
  return (
    <section className="panel" aria-label={`${label} 순위표`}>
      <table className="stand">
        <thead>
          <tr>
            <th scope="col" className="c-rank">순위</th>
            <th scope="col">팀</th>
            <th scope="col" className="c-bar">
              <Legend rounds={played} advance={advance} />
            </th>
            <th scope="col" className="r c-extra" title="1위 횟수">1위</th>
            <th scope="col" className="r c-extra">순위 점수</th>
            <th scope="col" className="r c-ks">{killLabel}</th>
            {anyPenalty && <th scope="col" className="r c-pen">감점</th>}
            <th scope="col" className="r">총점</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const cls = s.rank === 1 ? "first" : advance > 0 && s.rank <= advance ? "adv" : "";
            return (
              <tr key={s.key} className={advance > 0 && s.rank === advance && i < standings.length - 1 ? "cut" : undefined}>
                <td className="c-rank">
                  <span className={`rk ${cls}`}>{s.rank}</span> <Delta d={s.delta} />
                </td>
                <td>
                  <div className="nm">
                    <span className="ellipsis">{s.name}</span>
                    {s.fixed && <span className="cp">{s.fixed}위 확정</span>}
                    {mode !== "points" && s.checkpoint && <span className="cp">체크포인트</span>}
                  </div>
                  <div className="mini-bar">
                    <Bar s={s} max={max} rounds={played} height={10} labels={false} />
                  </div>
                </td>
                <td className="c-bar">
                  <Bar s={s} max={max} rounds={played} />
                </td>
                <td className="r c-extra num">{s.wins || ""}</td>
                <td className="r c-extra num">{fmt(s.rankScore)}</td>
                <td className="r c-ks num">{rules.tiebreak === "kills" ? fmt(s.kills) : fmt1(s.killScore)}</td>
                {anyPenalty && <td className="r c-pen num">{s.penalty > 0 ? `-${fmt(s.penalty)}` : ""}</td>}
                <td className="r tot num">
                  {fmt1(s.total)}
                  {s.tiedBy && (
                    <span className="tie-mark" title={`동점, ${TIE[s.tiedBy]}`} aria-label={`동점, ${TIE[s.tiedBy]}`}>
                      =
                    </span>
                  )}
                  <small className="ks-mobile muted">
                    {killLabel} {rules.tiebreak === "kills" ? fmt(s.kills) : fmt(s.killScore)}
                    {s.penalty > 0 && <span className="pen-note">, 감점 {fmt(s.penalty)}</span>}
                  </small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {ties.length > 0 && (
        <p className="stand-foot">
          {ties.map(([by, names]) => (
            <span key={by}>
              <span className="tie-mark">=</span> 동점인 {names.join(", ")}: {TIE[by]}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
