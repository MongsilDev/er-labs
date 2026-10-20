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
// 비교군이 30명이면 상위 1% 값이 사실상 최댓값이라 100명이 될 때까지 범위를 넓힘
export const TARGET_PEERS = 100;
export const PRIOR = 20;
export const WIDTHS = [0.1, 0.15, 0.2, 0.3, 0.5];
export const WARN = 0.9;
export const ALERT = 0.99;
export const PAIR = 0.95;

type Typical = { kpn: number; dpn: number; spn: number; hpn: number; hsr: number };

// 같은 family 지표는 같은 사망 수로 계산해 함께 변하므로 판정에서 하나로 셈
type Metric = { key: string; label: string; family: string; value: (s: Sample, t: Typical) => number | null; digits: number };

// 기록 수로 보정하는 지표, 최다 킬과 연속 기록은 보정하지 않음
export const SMOOTHED = new Set(["kd", "kpr", "surv", "kpm", "hs"]);

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

export const METRICS: Record<Kind, Metric[]> = {
  eft: [
    { key: "kd", label: "PMC K/D", family: "combat", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, Math.max(1, s.deaths + PRIOR * t.dpn)) },
    { key: "kpr", family: "combat", label: "레이드당 PMC 사살", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, s.n + PRIOR) },
    { key: "surv", family: "combat", label: "생존율", digits: 3, value: (s, t) => div(s.survived + PRIOR * t.spn, s.n + PRIOR) },
    { key: "streak", family: "streak", label: "연속 생존 횟수", digits: 0, value: (s) => s.streak },
  ],
  // 아레나는 모드마다 따로 비교. 모드별 플레이 시간이 없어 시간당 킬 대신 경기당 킬
  arena: [
    { key: "kd", label: "K/D", family: "kill", digits: 2, value: (s, t) => div(s.kills + PRIOR * t.kpn, Math.max(1, s.deaths + PRIOR * t.dpn)) },
    { key: "kpm", family: "kill", label: "경기당 킬", digits: 1, value: (s, t) => div(s.kills + PRIOR * t.kpn, s.n + PRIOR) },
    { key: "hs", family: "hs", label: "헤드샷 비율", digits: 3, value: (s, t) => div(s.headshots + 100 * t.hsr, s.kills + 100) },
    { key: "maxkills", family: "maxkills", label: "한 경기 최다 킬", digits: 0, value: (s) => s.maxGameKills },
    { key: "streak", family: "streak", label: "최고 연속 킬", digits: 0, value: (s) => s.streak },
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

// quantile의 역함수. 같은 값이 여럿이면 가장 낮은 위치로 봐서 경계값과 같으면 그 기준을 넘지 않은 것으로 셈
export function rank(sorted: number[], v: number): number {
  const n = sorted.length;
  if (n < 2 || v <= sorted[0]) return 0;
  if (v >= sorted[n - 1] && v > sorted[n - 2]) return 1;
  const i = sorted.findIndex((x) => x >= v);
  if (sorted[i] === v) return i / (n - 1);
  return (i - 1 + (v - sorted[i - 1]) / (sorted[i] - sorted[i - 1])) / (n - 1);
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

// top은 비교군 분포에서 이 값보다 위쪽의 비율. p90, p99와 같은 보간이라 상위 10% 값을 넘으면 0.1보다 작음
export type MetricResult = { key: string; label: string; family: string; digits: number; value: number; p90: number; p99: number; mean: number; top: number; level: 0 | 1 | 2; pair: boolean; far: boolean };

export type Judged = { state: "clear" | "warn" | "alert"; peers: number; width: number; metrics: MetricResult[] };
export type Unjudged = { state: "none"; reason: "few" | "peers" | "missing" };
// 아레나는 parts에 모드별 판정을 담음
export type VerdictPart = { key: string; games: number; v: Judged | Unjudged };
export type Verdict = Unjudged | (Judged & { parts?: VerdictPart[] });

// 가장 높은 단계를 쓰면 모드가 많을수록 우연히 기준을 넘는 모드가 생겨 이상 수치가 6.6%였음. 부정행위는 모든 모드에 같이 나타나므로 일관성을 요구
export function combine(parts: VerdictPart[]): Verdict {
  const judged = parts.filter((p): p is VerdictPart & { v: Judged } => p.v.state !== "none");
  if (!judged.length) return { state: "none", reason: parts.length ? "peers" : "few" };
  const alerts = judged.filter((p) => p.v.state === "alert").length;
  const flagged = judged.filter((p) => p.v.state !== "clear").length;
  const state = alerts && flagged === judged.length ? "alert" : alerts || flagged * 2 > judged.length ? "warn" : "clear";
  return { state, peers: judged.reduce((a, p) => a + p.v.peers, 0), width: Math.max(...judged.map((p) => p.v.width)), metrics: [], parts };
}

export function judge(kind: Kind, player: Sample, peers: Sample[], width: number): Judged | Unjudged {
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
    const p95 = quantile(vals, PAIR);
    const level = v > p99 && p99 > 0 ? 2 : v > p90 && p90 > 0 ? 1 : 0;
    const far = p99 > 0 && v > p99 + (p99 - p90);
    const top = 1 - rank(vals, v);
    metrics.push({ key: m.key, label: m.label, family: m.family, digits: m.digits, value: v, p90, p99, mean: trimmedMean(vals), top, level, pair: p95 > 0 && v > p95, far });
  }
  if (!metrics.length) return { state: "none", reason: "missing" };
  // 운영 비교군 전체에 적용해 이상 수치가 3% 안팎, 높은 수치가 6% 안팎이 되도록 정한 규칙
  const families = (pick: (m: MetricResult) => boolean) => new Set(metrics.filter(pick).map((m) => m.family)).size;
  const top1 = metrics.some((m) => m.level === 2);
  const alert = (top1 && families((m) => m.pair) >= 2) || metrics.some((m) => m.far);
  const warn = top1 || families((m) => m.level >= 1) >= 2;
  return { state: alert ? "alert" : warn ? "warn" : "clear", peers: peers.length, width, metrics };
}

export const VERDICT_LABEL = { clear: "특이점 없음", warn: "높은 수치", alert: "이상 수치", none: "판정 불가" } as const;

// 2026-10-20 비교군 계정 전체에 judge를 돌린 결과(%). 아레나는 combine으로 합친 계정 배지
export const BADGE_RATES = {
  date: "2026년 10월 20일",
  modes: {
    pvp: { label: "PvP", accounts: 16166, clear: 92.1, warn: 5.4, alert: 2.4 },
    season: { label: "시즌", accounts: 13430, clear: 91.4, warn: 6.0, alert: 2.6 },
    pve: { label: "PvE", accounts: 11104, clear: 90.7, warn: 6.4, alert: 2.9 },
    arena: { label: "아레나", accounts: 12478, clear: 90.1, warn: 7.2, alert: 2.7 },
  },
} as const;

export type RateMode = keyof typeof BADGE_RATES.modes;

// 상위 1% 안이면 1, 소수점 없이 올림
export const topPct = (top: number) => Math.max(1, Math.ceil(top * 100 - 1e-9));

// 중앙값 아래는 상위 99%처럼 읽기 어려워 하위로 표시
export const rankLabel = (top: number) => (top <= 0.5 ? `상위 ${topPct(top)}%` : `하위 ${topPct(1 - top)}%`);
