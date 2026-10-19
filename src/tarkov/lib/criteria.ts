// 비슷한 계정 무리와 비교해 판정 배지를 정함. 고정 기준값은 쓰지 않음

export type Sample = {
  hours: number;
  n: number;
  kills: number;
  deaths: number;
  survived: number;
  streak: number;
  headshots: number;
  maxGameKills: number;
};

export type Kind = "eft" | "arena";

export const MIN_N = 30;
export const MIN_PEERS = 30;
export const PRIOR = 20;
export const WIDTHS = [0.1, 0.15, 0.2, 0.3];
export const WARN = 0.9;
export const ALERT = 0.99;

type Typical = { kpn: number; dpn: number; spn: number; hpn: number; hsr: number };

// 같은 family 지표는 같은 사망 수에서 나와 함께 움직이므로 판정에서 하나로 셈
type Metric = { key: string; label: string; family: string; value: (s: Sample, t: Typical) => number | null; digits: number };

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export const METRICS: Record<Kind, Metric[]> = {
  eft: [
    { key: "kd", label: "PMC K/D", family: "combat", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, Math.max(1, s.deaths + PRIOR * t.dpn)) },
    { key: "kpr", family: "combat", label: "레이드당 PMC 킬", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, s.n + PRIOR) },
    { key: "surv", family: "combat", label: "생존율", digits: 3, value: (s, t) => div(s.survived + PRIOR * t.spn, s.n + PRIOR) },
    { key: "streak", family: "streak", label: "최장 연속 생존", digits: 0, value: (s) => s.streak },
  ],
  arena: [
    { key: "kd", label: "K/D", family: "kill", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, Math.max(1, s.deaths + PRIOR * t.dpn)) },
    { key: "hs", family: "hs", label: "헤드샷 비율", digits: 3, value: (s, t) => div(s.headshots + 100 * t.hsr, s.kills + 100) },
    { key: "kph", family: "kill", label: "시간당 킬", digits: 1, value: (s, t) => div(s.kills + PRIOR * t.kpn, s.hours + PRIOR * t.hpn) },
    { key: "maxkills", family: "maxkills", label: "한 경기 최다 킬", digits: 0, value: (s) => s.maxGameKills },
  ],
};

// 양쪽 10%를 잘라낸 평균
export function trimmedMean(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const cut = Math.floor(s.length * 0.1);
  const mid = s.slice(cut, s.length - cut);
  return mid.reduce((a, b) => a + b, 0) / mid.length;
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function typical(peers: Sample[]): Typical {
  return {
    kpn: trimmedMean(peers.map((p) => div(p.kills, p.n))),
    dpn: trimmedMean(peers.map((p) => div(p.deaths, p.n))),
    spn: trimmedMean(peers.map((p) => div(p.survived, p.n))),
    hpn: trimmedMean(peers.map((p) => div(p.hours, p.n))),
    hsr: trimmedMean(peers.filter((p) => p.kills > 0).map((p) => div(p.headshots, p.kills))),
  };
}

export type MetricResult = { key: string; label: string; family: string; digits: number; value: number; p90: number; p99: number; mean: number; level: 0 | 1 | 2 };

export type Verdict =
  | { state: "none"; reason: "few" | "peers" | "missing" }
  | { state: "clear" | "warn" | "alert"; peers: number; width: number; metrics: MetricResult[] };

export function judge(kind: Kind, player: Sample, peers: Sample[], width: number): Verdict {
  if (player.n < MIN_N) return { state: "none", reason: "few" };
  if (peers.length < MIN_PEERS) return { state: "none", reason: "peers" };
  const t = typical(peers);
  const metrics: MetricResult[] = [];
  for (const m of METRICS[kind]) {
    const v = m.value(player, t);
    if (v == null) continue;
    const vals = peers.map((p) => m.value(p, t)).filter((x): x is number => x != null).sort((a, b) => a - b);
    if (vals.length < MIN_PEERS) continue;
    const p90 = quantile(vals, WARN);
    const p99 = quantile(vals, ALERT);
    const level = v > p99 && p99 > 0 ? 2 : v > p90 && p90 > 0 ? 1 : 0;
    metrics.push({ key: m.key, label: m.label, family: m.family, digits: m.digits, value: v, p90, p99, mean: trimmedMean(vals), level });
  }
  if (!metrics.length) return { state: "none", reason: "missing" };
  const alerts = metrics.filter((m) => m.level === 2).length;
  const warns = new Set(metrics.filter((m) => m.level >= 1).map((m) => m.family)).size;
  const state = alerts >= 1 || warns >= 2 ? "alert" : warns === 1 ? "warn" : "clear";
  return { state, peers: peers.length, width, metrics };
}

export const VERDICT_LABEL = { clear: "특이점 없음", warn: "확인 필요", alert: "이상 수치", none: "판정 불가" } as const;
