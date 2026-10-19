import Link from "next/link";
import { VERDICT_LABEL, WIDTHS, type Verdict as V } from "@/tarkov/lib/criteria";
import { dec, pct } from "@/tarkov/lib/format";

const REASON = {
  few: "기록이 30회 미만이라 판정하지 않습니다.",
  peers: "비교할 비슷한 계정이 30명보다 적어 판정하지 않습니다.",
  missing: "판정에 필요한 값이 없습니다.",
} as const;

const show = (key: string, v: number, digits: number) => (key === "surv" || key === "hs" ? pct(v) : dec(v, digits));

export default function Verdict({ v, mode, official }: { v: V; mode: string; official: boolean }) {
  const unit = mode === "arena" ? "아레나 플레이 시간과 경기 수" : "플레이 시간과 레이드 수";
  return (
    <section className={`panel verdict ${v.state}`}>
      <div className="vhead">
        <span className={`badge ${v.state}`}>{VERDICT_LABEL[v.state]}</span>
        {official && <span className="chip official">공인 계정</span>}
        <span className="small muted">통계 기준이며 증거가 아닙니다.</span>
        <Link className="link" href="/tarkov/criteria">
          판정 기준
        </Link>
      </div>
      {v.state === "none" ? (
        <p className="sub">{REASON[v.reason]}</p>
      ) : (
        <>
          <p className="sub">
            {unit}가 ±{Math.round(v.width * 100)}% 안인 계정 {v.peers.toLocaleString("en-US")}명과 비교했습니다.
            {v.width > WIDTHS[0] && (
              <>
                <br />
                비슷한 계정이 적어 범위를 넓혔습니다.
              </>
            )}
          </p>
          <div className="table-scroll">
            <table className="grid-table vtable">
              <thead>
                <tr>
                  <th>지표</th>
                  <th>보정값</th>
                  <th>비교군 평균</th>
                  <th>상위 10%</th>
                  <th>상위 1%</th>
                </tr>
              </thead>
              <tbody>
                {v.metrics.map((m) => (
                  <tr key={m.key} className={m.level === 2 ? "lv2" : m.level === 1 ? "lv1" : undefined}>
                    <td className="nowrap">{m.label}</td>
                    <td className="num strong">{show(m.key, m.value, m.digits)}</td>
                    <td className="num">{show(m.key, m.mean, m.digits)}</td>
                    <td className="num">{show(m.key, m.p90, m.digits)}</td>
                    <td className="num">{show(m.key, m.p99, m.digits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
