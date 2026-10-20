import Link from "next/link";
import { SMOOTHED, VERDICT_LABEL, WIDTHS, type Judged, type MetricResult, type Verdict as V } from "@/tarkov/lib/criteria";
import { dec, pct } from "@/tarkov/lib/format";
import { arenaModeLabel } from "@/tarkov/lib/labels";

const REASON = {
  few: "기록이 30회 미만이라 판정하지 않습니다.",
  peers: "비교할 비슷한 계정이 30명보다 적어 판정하지 않습니다.",
  missing: "판정에 필요한 값이 없습니다.",
} as const;

const ARENA_REASON = {
  few: "30경기 이상 플레이한 모드가 없어 판정하지 않습니다.",
  peers: "같은 모드에서 비교할 비슷한 계정이 30명보다 적어 판정하지 않습니다.",
  missing: "판정에 필요한 값이 없습니다.",
} as const;


const show = (key: string, v: number, digits: number) => (key === "surv" || key === "hs" ? pct(v) : dec(v, digits));

function Bars({ metrics }: { metrics: MetricResult[] }) {
  return (
    <ul className="vbars">
      {metrics.map((m) => {
        const max = Math.max(m.p99, m.value) * 1.08 || 1;
        const at = (x: number) => `${Math.min(100, (x / max) * 100)}%`;
        return (
          <li key={m.key} className={m.level === 2 ? "lv2" : m.level === 1 ? "lv1" : undefined}>
            <div className="vbar-head">
              <b>{m.label}</b>
              <span className="vbar-val">
                {SMOOTHED.has(m.key) && <span className="small muted">보정값</span>}
                <span className="num strong">{show(m.key, m.value, m.digits)}</span>
              </span>
            </div>
            <div className="vbar" aria-hidden="true">
              <i className="fill" style={{ width: at(m.value) }} />
              <i className="mark mean" style={{ left: at(m.mean) }} />
              <i className="mark p90" style={{ left: at(m.p90) }} />
              <i className="mark p99" style={{ left: at(m.p99) }} />
            </div>
            <div className="vbar-foot small muted num">
              <span>평균 {show(m.key, m.mean, m.digits)}</span>
              <span>상위 10% {show(m.key, m.p90, m.digits)}</span>
              <span>상위 1% {show(m.key, m.p99, m.digits)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const range = (v: Judged, unit: string) => `${unit}가 ±${Math.round(v.width * 100)}% 안인 계정 ${v.peers.toLocaleString("en-US")}명과 비교했습니다.`;

export default function Verdict({ v, mode, official }: { v: V; mode: string; official: boolean }) {
  const arena = mode === "arena";
  return (
    <section className={`panel verdict ${v.state}`}>
      <div className="vhead">
        <span className={`badge ${v.state}`}>{VERDICT_LABEL[v.state]}</span>
        {official && <span className="chip official">공인 계정</span>}
        <span className="small muted">통계로 낸 판정이며 증거가 아닙니다.</span>
        <Link className="link" href="/tarkov/criteria">
          판정 기준
        </Link>
      </div>
      {v.state === "none" ? (
        <p className="sub">{(arena ? ARENA_REASON : REASON)[v.reason]}</p>
      ) : v.parts ? (
        v.parts.map((p) => (
          <div key={p.key} className="vpart">
            <div className="vpart-head">
              <b>{arenaModeLabel(p.key)}</b>
              <span className="muted num">{p.games.toLocaleString("en-US")}경기</span>
              <span className={`badge sm ${p.v.state}`}>{VERDICT_LABEL[p.v.state]}</span>
            </div>
            {p.v.state === "none" ? (
              <p className="sub">{ARENA_REASON[p.v.reason]}</p>
            ) : (
              <>
                <p className="sub">
                  {range(p.v, "이 모드의 경기 수")}
                  {p.v.width > WIDTHS[0] && (
                    <>
                      <br />
                      비슷한 계정이 적어 범위를 넓혔습니다.
                    </>
                  )}
                </p>
                <Bars metrics={p.v.metrics} />
              </>
            )}
          </div>
        ))
      ) : (
        <>
          <p className="sub">
            {range(v, "플레이 시간과 레이드 수")}
            {v.width > WIDTHS[0] && (
              <>
                <br />
                비슷한 계정이 적어 범위를 넓혔습니다.
              </>
            )}
          </p>
          <Bars metrics={v.metrics} />
        </>
      )}
    </section>
  );
}
