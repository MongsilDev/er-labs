import Link from "next/link";
import { RATE_LABEL, rankLabel, SMOOTHED, VERDICT_LABEL, WIDTHS, type Judged, type MetricResult, type ModeRate, type RateMode, type Verdict as V } from "@/tarkov/lib/criteria";
import { dec, pct } from "@/tarkov/lib/format";
import { arenaModeLabel } from "@/tarkov/lib/labels";

const REASON = {
  few: "PMC 레이드가 30회 미만이라 판정하지 않습니다.",
  peers: "비교할 비슷한 계정이 30명보다 적어 판정하지 않습니다.",
  missing: "판정에 필요한 값이 없습니다.",
} as const;

const ARENA_REASON = {
  few: "30매치 이상 플레이한 모드가 없어 판정하지 않습니다.",
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
              <span className="vbar-name">
                <b>{m.label}</b>
                <span className={m.top > 0.5 ? "vtop num low" : "vtop num"}>{rankLabel(m.top)}</span>
              </span>
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
              <i className="knob" style={{ left: at(m.value) }} />
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

const range = (v: Judged, unit: string) => `${unit}가 ±${Math.round(v.width * 100)}% 안인 계정 ${v.peers.toLocaleString("en-US")}명과 비교한 순위입니다.`;

// 배지와 지표 색이 달라 보이는 경우의 이유
const oneFamily = (v: Judged) => v.state === "clear" && v.metrics.some((m) => m.level > 0);

function Sub({ v, unit }: { v: Judged; unit: string }) {
  return (
    <p className="sub">
      {range(v, unit)}
      {v.width > WIDTHS[0] && (
        <>
          <br />
          비슷한 계정이 적어 범위를 넓혔습니다.
        </>
      )}
      {oneFamily(v) && (
        <>
          <br />
          상위 10%를 넘은 지표가 한 묶음뿐이라 {VERDICT_LABEL.clear}으로 판정했습니다.
        </>
      )}
    </p>
  );
}

const RANK = { alert: 3, warn: 2, clear: 1, none: 0 } as const;
const openPart = (parts: { key: string; v: { state: keyof typeof RANK } }[]) => parts.reduce((a, p) => (RANK[p.v.state] > RANK[a.v.state] ? p : a)).key;

export default function Verdict({ v, mode, official, rate }: { v: V; mode: string; official: boolean; rate?: ModeRate }) {
  const arena = mode === "arena";
  const mixed = v.state === "warn" && v.parts?.some((p) => p.v.state === "alert");
  const outvoted = v.state === "clear" && v.parts?.some((p) => p.v.state !== "clear" && p.v.state !== "none");
  return (
    <section className={`panel verdict ${v.state}`}>
      <div className="vhead">
        <span className={`badge ${v.state}`}>{VERDICT_LABEL[v.state]}</span>
        {official && <span className="chip official">공인 계정</span>}
        {rate && v.state !== "none" && (
          <span className="vrate">
            {RATE_LABEL[mode as RateMode]} 비교군 계정의 <b className="num">{Math.round(rate[v.state])}%</b>가 받는 배지
          </span>
        )}
      </div>
      <p className="small muted">
        통계로 낸 판정이며 증거가 아닙니다.{" "}
        <Link className="link" href="/tarkov/criteria">
          판정 기준
        </Link>
      </p>
      {mixed && <p className="sub">{VERDICT_LABEL.alert}인 모드가 있지만 모든 모드가 {VERDICT_LABEL.warn} 이상은 아니라 {VERDICT_LABEL.warn}로 판정했습니다.</p>}
      {outvoted && <p className="sub">{VERDICT_LABEL.warn} 이상인 모드가 판정한 모드의 절반을 넘지 않아 {VERDICT_LABEL.clear}으로 판정했습니다.</p>}
      {v.state === "none" ? (
        <p className="sub">{(arena ? ARENA_REASON : REASON)[v.reason]}</p>
      ) : v.parts ? (
        v.parts.map((p) => (
          // 모드가 여럿이면 막대가 화면을 다 차지해 가장 높은 판정의 모드만 펼침
          <details key={p.key} className="vpart" open={p.key === openPart(v.parts!)}>
            <summary className="vpart-head">
              <b>{arenaModeLabel(p.key)}</b>
              <span className="muted num">{p.games.toLocaleString("en-US")}매치</span>
              <span className={`badge sm ${p.v.state}`}>{VERDICT_LABEL[p.v.state]}</span>
            </summary>
            {p.v.state === "none" ? (
              <p className="sub">{ARENA_REASON[p.v.reason]}</p>
            ) : (
              <>
                <Sub v={p.v} unit="이 모드의 매치 수" />
                <Bars metrics={p.v.metrics} />
              </>
            )}
          </details>
        ))
      ) : (
        <>
          <Sub v={v} unit="플레이 시간과 레이드 수" />
          <Bars metrics={v.metrics} />
        </>
      )}
    </section>
  );
}
