import { FINAL_ROUNDS } from "./kel";
import { CHECKPOINT_SEQUENCE, PLACEMENT_POINTS, defaultMainWeather } from "./rules";

// penalty는 처치한 선수가 없는 탈락처럼 게임 안에서 생긴 감점, rule은 지각처럼 라운드 사이에 받은 규정 감점
export type Entry = { placement: number; kills: number; killScore: number; penalty: number; rule?: number };
export type Round = Record<string, Entry>;
export type Row = { key: string; total: number; kills: number; penalty: number; last: number | null; places: (number | null)[] };

// 순위별 시즌 팀 경기의 [킬 점수, 킬 수] 목록, 0번이 1위
export type KillPool = [number, number][][];

const r2 = (n: number) => Math.round(n * 100) / 100;

export const gameScore = (e: Entry) => (PLACEMENT_POINTS[e.placement - 1] ?? 0) + e.killScore;

export function tally(teams: string[], rounds: Round[]): Row[] {
  return teams.map((key) => {
    let total = 0;
    let kills = 0;
    let penalty = 0;
    let last: number | null = null;
    const places: (number | null)[] = [];
    for (const round of rounds) {
      const e = round[key];
      places.push(e?.placement ?? null);
      if (!e) continue;
      const cut = e.penalty + (e.rule ?? 0);
      total += gameScore(e) - cut;
      kills += e.kills;
      penalty += cut;
      last = e.placement;
    }
    return { key, total: r2(total), kills, penalty: r2(penalty), last, places };
  });
}

// 규정집 제9조 아: 총점, 킬 수, 마지막 라운드 순위
export const compareRows = (a: Row, b: Row) => b.total - a.total || b.kills - a.kills || (a.last ?? 99) - (b.last ?? 99);

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
  if (rows.every((r) => r.total === rows[0].total && r.kills === rows[0].kills && r.last === rows[0].last)) return new Map(rows.map((r) => [r.key, advance / n]));
  const hits = new Float64Array(n);
  const total = new Float64Array(n);
  const kills = new Float64Array(n);
  const last = new Float64Array(n);
  const order = rows.map((_, i) => i);
  const idx = rows.map((_, i) => i);
  const rand = mulberry32(seed);
  for (let run = 0; run < runs; run++) {
    for (let i = 0; i < n; i++) {
      total[i] = rows[i].total;
      kills[i] = rows[i].kills;
      last[i] = rows[i].last ?? 99;
    }
    for (let r = 0; r < left; r++) {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      for (let p = 0; p < n; p++) {
        const t = order[p];
        const list = pool[p];
        const [ks, k] = list.length ? list[Math.floor(rand() * list.length)] : [0, 0];
        total[t] += (PLACEMENT_POINTS[p] ?? 0) + ks;
        kills[t] += k;
        last[t] = p + 1;
      }
    }
    idx.sort((a, b) => total[b] - total[a] || kills[b] - kills[a] || last[a] - last[b]);
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
  next: { roundNo: number; checkpoint: string[]; weather: string | null; main: string } | null;
};

// 엔진 computeGroup은 선수 단위 입력을 받고 동점이면 킬 점수까지 비교해서 따로 둠
export function finalState(teams: string[], rounds: Round[]): FinalState {
  const played = Math.min(rounds.length, FINAL_ROUNDS);
  let status = new Set<string>();
  let champion: FinalState["champion"] = null;
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
    next: ended
      ? null
      : { roundNo, checkpoint: rows.filter((x) => x.checkpoint).map((x) => x.key), weather: rows.find((x) => x.checkpoint)?.key ?? null, main: defaultMainWeather(roundNo) },
  };
}
