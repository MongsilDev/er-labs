import { FINAL_ROUNDS } from "./kel";
import { CHECKPOINT_SEQUENCE, PLACEMENT_POINTS, defaultMainWeather } from "./rules";

// penalty는 처치한 선수가 없는 탈락처럼 게임 안에서 생긴 감점, rule은 지각처럼 라운드 사이에 받은 규정 감점
export type Entry = { placement: number; killScore: number; penalty: number; rule?: number };
export type Round = Record<string, Entry>;
export type Row = { key: string; total: number; killScore: number; penalty: number; last: number | null; places: (number | null)[] };

// 순위별 시즌 팀 경기의 킬 점수 목록, 0번이 1위
export type KillPool = number[][];

const r2 = (n: number) => Math.round(n * 100) / 100;

export const placementPoints = (placement: number) => PLACEMENT_POINTS[placement - 1] ?? 0;
export const gameScore = (e: Entry) => placementPoints(e.placement) + e.killScore;

export function tally(teams: string[], rounds: Round[]): Row[] {
  return teams.map((key) => {
    let total = 0;
    let killScore = 0;
    let penalty = 0;
    let last: number | null = null;
    const places: (number | null)[] = [];
    for (const round of rounds) {
      const e = round[key];
      places.push(e?.placement ?? null);
      if (!e) continue;
      const cut = e.penalty + (e.rule ?? 0);
      total += gameScore(e) - cut;
      killScore += e.killScore;
      penalty += cut;
      last = e.placement;
    }
    return { key, total: r2(total), killScore: r2(killScore), penalty: r2(penalty), last, places };
  });
}

// 규정집 제9조는 킬 수로 적었지만 공식 순위표는 킬 점수로 동점을 가름(서킷 1 결승, 서킷 3 A조)
export const compareRows = (a: Pick<Row, "total" | "killScore" | "last">, b: Pick<Row, "total" | "killScore" | "last">) =>
  b.total - a.total || b.killScore - a.killScore || (a.last ?? 99) - (b.last ?? 99);

export const standings = (teams: string[], rounds: Round[]) => tally(teams, rounds).sort(compareRows);

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 남은 라운드 순위는 모든 팀이 같은 확률로 나눠 갖고, 킬은 같은 순위의 시즌 기록에서 하나씩 뽑음
export function advanceOdds(rows: Row[], left: number, advance: number, pool: KillPool, runs: number, seed = 2026): Map<string, number> {
  const n = rows.length;
  if (left <= 0) return new Map([...rows].sort(compareRows).map((r, i) => [r.key, i < advance ? 1 : 0]));
  if (rows.every((r) => compareRows(r, rows[0]) === 0)) return new Map(rows.map((r) => [r.key, advance / n]));
  const hits = new Float64Array(n);
  const live = rows.map(() => ({ total: 0, killScore: 0, last: null as number | null }));
  const order = rows.map((_, i) => i);
  const idx = rows.map((_, i) => i);
  const rand = mulberry32(seed);
  for (let run = 0; run < runs; run++) {
    for (let i = 0; i < n; i++) {
      live[i].total = rows[i].total;
      live[i].killScore = rows[i].killScore;
      live[i].last = rows[i].last;
    }
    for (let r = 0; r < left; r++) {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      for (let p = 0; p < n; p++) {
        const s = live[order[p]];
        const list = pool[p];
        const k = list.length ? list[Math.floor(rand() * list.length)] : 0;
        s.total += placementPoints(p + 1) + k;
        s.killScore += k;
        s.last = p + 1;
      }
    }
    idx.sort((a, b) => compareRows(live[a], live[b]));
    for (let i = 0; i < advance; i++) hits[idx[i]]++;
  }
  return new Map(rows.map((r, i) => [r.key, hits[i] / runs]));
}

// 진출 확정: 남은 라운드에서 이 팀이 0점이고 다른 팀이 매 라운드 1위와 시즌 최고 킬 점수를 얻어도 따라잡을 팀이 advance보다 적음
export function certainty(rows: Row[], left: number, advance: number, maxKillScore: number): Map<string, "in" | "out"> {
  const out = new Map<string, "in" | "out">();
  if (left <= 0) {
    [...rows].sort(compareRows).forEach((r, i) => out.set(r.key, i < advance ? "in" : "out"));
    return out;
  }
  const gain = left * (PLACEMENT_POINTS[0] + maxKillScore);
  for (const t of rows) {
    const reach = rows.filter((u) => u !== t && u.total + gain >= t.total).length;
    const above = rows.filter((u) => u !== t && u.total > t.total + gain).length;
    if (reach < advance) out.set(t.key, "in");
    else if (above >= advance) out.set(t.key, "out");
  }
  return out;
}

export type FinalState = {
  rows: (Row & { checkpoint: boolean })[];
  champion: { key: string; round: number } | null;
  played: number;
  holders: string[][];
  next: { roundNo: number; checkpoint: string[]; weather: string | null; main: string } | null;
};

// 엔진 computeGroup은 선수 단위 입력을 받고 동점이면 킬 수와 이름까지 비교해서 따로 둠
export function finalState(teams: string[], rounds: Round[]): FinalState {
  const played = Math.min(rounds.length, FINAL_ROUNDS);
  let status = new Set<string>();
  let champion: FinalState["champion"] = null;
  const holders: string[][] = [];
  for (let r = 1; r <= Math.min(played + 1, FINAL_ROUNDS); r++) {
    const done = rounds.slice(0, r - 1);
    const n = Math.min(CHECKPOINT_SEQUENCE[r - 1] ?? teams.length, teams.length);
    const next = new Set(
      standings(teams, done)
        .slice(0, n)
        .map((x) => x.key),
    );
    // 9월 7일 개정 공지: 체크포인트를 받은 팀은 라운드 사이 규정 감점으로 순위가 내려가도 유지
    if (n > 0 && r > 1) {
      const pen = rounds[r - 2];
      const free = tally(teams, done)
        .map((x) => ({ ...x, total: x.total + (pen[x.key]?.rule ?? 0) }))
        .sort(compareRows)
        .slice(0, n);
      for (const x of free) if (status.has(x.key)) next.add(x.key);
    }
    status = next;
    if (r > played) break;
    holders.push([...status]);
    const winner = Object.keys(rounds[r - 1]).find((k) => rounds[r - 1][k].placement === 1);
    if (winner && status.has(winner)) {
      champion = { key: winner, round: r };
      break;
    }
  }
  const counted = champion ? champion.round : played;
  const sorted = standings(teams, rounds.slice(0, counted));
  if (champion)
    sorted.unshift(
      ...sorted.splice(
        sorted.findIndex((x) => x.key === champion.key),
        1,
      ),
    );
  const ended = Boolean(champion) || played >= FINAL_ROUNDS;
  const rows = sorted.map((x) => ({ ...x, checkpoint: !ended && status.has(x.key) }));
  const roundNo = counted + 1;
  return {
    rows,
    champion,
    played: counted,
    holders,
    next: ended
      ? null
      : { roundNo, checkpoint: rows.filter((x) => x.checkpoint).map((x) => x.key), weather: rows.find((x) => x.checkpoint)?.key ?? null, main: defaultMainWeather(roundNo) },
  };
}
