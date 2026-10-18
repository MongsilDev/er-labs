import type { Player } from "./parse";
import { CHECKPOINT_SEQUENCE, MAIN_WEATHERS, SUB_WEATHERS, defaultMainWeather, type Mode, type Rules } from "./rules";

export type RoundInput = {
  roundNo: number;
  source: "csv" | "manual";
  gameId: number | null;
  players: Player[];
};

export type PenaltyInput = {
  id: number;
  team: string;
  roundNo: number;
  kind: "death" | "rule";
  count: number;
  points: number;
  reason: string;
};

export type WeatherInput = { roundNo: number; main: string | null; sub: string | null };

export type GroupInput = {
  mode: Mode;
  rules: Rules;
  plannedRounds: number;
  rounds: RoundInput[];
  penalties: PenaltyInput[];
  weather: WeatherInput[];
  aliases: Record<string, string>;
  overrides: Record<string, boolean>;
};

export type TeamRound = {
  placement: number | null;
  killScore: number;
  kills: number;
  score: number;
};

export type Standing = {
  key: string;
  name: string;
  rank: number;
  delta: number;
  rounds: (TeamRound | null)[];
  roundScore: number;
  killScore: number;
  kills: number;
  penalty: number;
  total: number;
  lastPlacement: number | null;
  checkpoint: boolean;
  fixed: number | null;
  tiedBy: "killScore" | "kills" | "lastPlacement" | null;
};

export type RoundSummary = {
  roundNo: number;
  gameId: number | null;
  source: "csv" | "manual";
  teamCount: number;
  winner: string | null;
  main: string;
  sub: string | null;
};

export type NextRound = {
  roundNo: number;
  main: string;
  sub: string | null;
  subRemaining: string[];
  bans: string[];
  checkpoint: string[];
};

export type PlayerStat = { nickname: string; team: string; value: number; rank: number };

export type GroupResult = {
  standings: Standing[];
  rounds: RoundSummary[];
  played: number;
  next: NextRound | null;
  ended: boolean;
  picks: { roundNo: number; counts: { character: string; count: number; banRounds: number }[] }[];
  players: { kills: PlayerStat[]; hunting: PlayerStat[]; level: PlayerStat[] };
};

const DEFAULT_TEAM = /^team\s*\d+$/i;
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

type Agg = TeamRound & { name: string; key: string; nicknames: Set<string>; csvTotal: number };

function aggregate(round: RoundInput, rules: Rules, rename: (name: string) => string, history: Map<string, Set<string>>[]) {
  const byName = new Map<string, Agg>();
  for (const p of round.players) {
    const name = rename(p.team.trim().replace(/\s+/g, " "));
    const a: Agg = byName.get(name) ?? {
      name,
      key: "",
      placement: null,
      killScore: 0,
      kills: 0,
      score: 0,
      nicknames: new Set<string>(),
      csvTotal: -Infinity,
    };
    a.csvTotal = Math.max(a.csvTotal, p.totalScore);
    a.killScore = Math.max(a.killScore, p.killScore);
    a.kills = Math.max(a.kills, p.teamKills || 0);
    if (p.placement !== null) a.placement = a.placement === null ? p.placement : Math.min(a.placement, p.placement);
    if (p.nickname) a.nicknames.add(normalize(p.nickname));
    byName.set(name, a);
  }

  for (const a of byName.values()) {
    if (!DEFAULT_TEAM.test(a.name)) continue;
    let best: string | null = null;
    let bestCount = 0;
    for (const previous of history) {
      for (const [name, nicks] of previous) {
        if (DEFAULT_TEAM.test(name)) continue;
        let overlap = 0;
        for (const n of a.nicknames) if (nicks.has(n)) overlap++;
        if (overlap >= 2 && overlap > bestCount) {
          bestCount = overlap;
          best = name;
        }
      }
    }
    if (best) a.name = rename(best);
  }

  const merged = new Map<string, Agg>();
  for (const a of byName.values()) {
    const key = normalize(a.name);
    const fromTable =
      a.placement === null ? 0 : (rules.placementPoints[a.placement - 1] ?? 0) + a.killScore * rules.killMultiplier;
    const score = round2(round.source === "manual" || rules.scoreSource === "table" ? fromTable : a.csvTotal);
    const prev = merged.get(key);
    if (prev) {
      prev.score = Math.max(prev.score, score);
      prev.killScore = Math.max(prev.killScore, a.killScore);
      prev.kills = Math.max(prev.kills, a.kills);
      for (const n of a.nicknames) prev.nicknames.add(n);
    } else {
      merged.set(key, { ...a, key, score });
    }
  }
  return merged;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function penaltyPoints(p: PenaltyInput, rules: Rules) {
  if (p.kind === "death") return rules.deathPenalty ? p.count : 0;
  return p.points;
}

export function banRoundsFor(count: number): number {
  if (count >= 5) return 3;
  if (count === 4) return 2;
  if (count === 3) return 1;
  return 0;
}

function rank<T>(items: T[], value: (t: T) => number): (T & { value: number; rank: number })[] {
  const withValue = items.map((t) => ({ ...t, value: value(t) }));
  withValue.sort((a, b) => b.value - a.value);
  return withValue.map((t) => ({ ...t, rank: 1 + withValue.filter((o) => o.value > t.value).length }));
}

export function computeGroup(input: GroupInput): GroupResult {
  const { rules, mode } = input;
  const alias = new Map(Object.entries(input.aliases).map(([k, v]) => [normalize(k), v]));
  const rename = (name: string) => {
    let current = name;
    for (let i = 0; i < 5; i++) {
      const next = alias.get(normalize(current));
      if (!next || normalize(next) === normalize(current)) break;
      current = next;
    }
    return current;
  };

  const ordered = [...input.rounds].sort((a, b) => a.roundNo - b.roundNo);
  const played = ordered.length ? ordered[ordered.length - 1].roundNo : 0;
  const perRound: (Map<string, Agg> | null)[] = Array(played).fill(null);
  const roundByNo = new Map(ordered.map((r) => [r.roundNo, r]));
  const history: Map<string, Set<string>>[] = [];
  const names = new Map<string, string>();
  const nickTeam = new Map<string, string>();

  for (let r = 1; r <= played; r++) {
    const round = roundByNo.get(r);
    if (!round) continue;
    const teams = aggregate(round, rules, rename, history);
    perRound[r - 1] = teams;
    history.push(new Map([...teams.values()].map((t) => [t.name, t.nicknames])));
    for (const t of teams.values()) {
      if (!names.has(t.key)) names.set(t.key, t.name);
      for (const n of t.nicknames) nickTeam.set(n, t.key);
    }
  }
  const penalties = input.penalties.map((p) => ({ ...p, key: normalize(rename(p.team)) }));
  for (const p of penalties) if (!names.has(p.key)) names.set(p.key, rename(p.team));

  const keys = [...names.keys()];
  const roundsOf = (key: string) => perRound.map((m) => (m?.get(key) as TeamRound | undefined) ?? null);

  type Row = { key: string; total: number; killScore: number; kills: number; last: number | null; ruleFree: number };
  const totalsAfter = (r: number): Row[] =>
    keys.map((key) => {
      const rs = roundsOf(key).slice(0, r);
      const sum = rs.reduce((a, x) => a + (x?.score ?? 0), 0);
      const pen = penalties.filter((p) => p.key === key && p.roundNo <= r);
      const all = pen.reduce((a, p) => a + penaltyPoints(p, rules), 0);
      const rule = pen.filter((p) => p.kind === "rule").reduce((a, p) => a + p.points, 0);
      const last = [...rs].reverse().find((x) => x !== null);
      return {
        key,
        total: round2(sum - all),
        killScore: round2(rs.reduce((a, x) => a + (x?.killScore ?? 0), 0)),
        kills: rs.reduce((a, x) => a + (x?.kills ?? 0), 0),
        last: last?.placement ?? null,
        ruleFree: round2(sum - all + rule),
      };
    });

  const compare = (a: Row, b: Row) =>
    b.total - a.total ||
    (rules.tiebreak === "kills" ? b.kills - a.kills || b.killScore - a.killScore : b.killScore - a.killScore || b.kills - a.kills) ||
    (a.last ?? 99) - (b.last ?? 99) ||
    byText(names.get(a.key) ?? "", names.get(b.key) ?? "");

  const fixed: { key: string; round: number }[] = [];
  let status = new Set<string>();
  const statusAt: Set<string>[] = [];
  let ended = mode === "points" ? played >= input.plannedRounds && played > 0 : false;
  const need = mode === "double" ? 2 : 1;

  const orderFor = (r: number, rows: Row[]) => {
    const fixedKeys = fixed.filter((f) => f.round <= r).map((f) => f.key);
    const rest = rows.filter((x) => !fixedKeys.includes(x.key)).sort(compare);
    return [...fixedKeys.map((k) => rows.find((x) => x.key === k)!).filter(Boolean), ...rest];
  };

  if (mode !== "points") {
    for (let r = 1; r <= played + 1; r++) {
      const rows = totalsAfter(r - 1);
      const fixedKeys = new Set(fixed.map((f) => f.key));
      const open = rows.filter((x) => !fixedKeys.has(x.key));
      const next = new Set<string>();
      if (rules.checkpoint.type === "points") {
        for (const x of open) if (x.total >= rules.checkpoint.points) next.add(x.key);
      } else {
        const seq = rules.checkpoint.sequence.length ? rules.checkpoint.sequence : CHECKPOINT_SEQUENCE;
        const n = seq[Math.min(r - 1, seq.length - 1)] ?? 0;
        const sorted = [...open].sort(compare);
        for (const x of sorted.slice(0, n)) next.add(x.key);
        if (rules.checkpoint.penaltyKeeps && n > 0) {
          const byRuleFree = [...open].sort((a, b) => b.ruleFree - a.ruleFree || compare(a, b)).slice(0, n);
          for (const x of byRuleFree) if (status.has(x.key)) next.add(x.key);
        }
      }
      if (rules.checkpoint.keep) for (const k of status) if (!fixedKeys.has(k)) next.add(k);
      for (const [k, v] of Object.entries(input.overrides)) {
        const [rn, key] = [Number(k.split(":")[0]), k.slice(k.indexOf(":") + 1)];
        if (rn !== r) continue;
        if (v) next.add(key);
        else next.delete(key);
      }
      status = next;
      statusAt[r - 1] = status;
      if (r > played || ended) continue;
      const teams = perRound[r - 1];
      if (!teams) continue;
      const winner = [...teams.values()].find((t) => t.placement === 1);
      if (winner && status.has(winner.key) && !fixedKeys.has(winner.key)) {
        fixed.push({ key: winner.key, round: r });
        if (fixed.length >= need) ended = true;
      }
    }
    if (played >= input.plannedRounds && played > 0) ended = true;
  }

  const now = orderFor(played, totalsAfter(played));
  const prev = played > 1 ? orderFor(played - 1, totalsAfter(played - 1)) : null;
  const finalStatus = statusAt[played] ?? new Set<string>();

  const standings: Standing[] = now.map((x, i) => {
    const rs = roundsOf(x.key);
    const pi = prev ? prev.findIndex((p) => p.key === x.key) : -1;
    const fixedIndex = fixed.findIndex((f) => f.key === x.key);
    const neighbor = now[i - 1] ?? now[i + 1];
    let tiedBy: Standing["tiedBy"] = null;
    if (fixedIndex < 0 && neighbor && neighbor.total === x.total && !fixed.some((f) => f.key === neighbor.key)) {
      const primary = rules.tiebreak === "kills" ? "kills" : "killScore";
      tiedBy = neighbor[primary] !== x[primary] ? primary : "lastPlacement";
    }
    return {
      key: x.key,
      name: names.get(x.key) ?? x.key,
      rank: i + 1,
      delta: pi >= 0 ? pi - i : 0,
      rounds: rs,
      roundScore: round2(rs.reduce((a, r) => a + (r?.score ?? 0), 0)),
      killScore: x.killScore,
      kills: x.kills,
      penalty: round2(rs.reduce((a, r) => a + (r?.score ?? 0), 0) - x.total),
      total: x.total,
      lastPlacement: x.last,
      checkpoint: !ended && finalStatus.has(x.key),
      fixed: fixedIndex >= 0 ? fixedIndex + 1 : null,
      tiedBy,
    };
  });

  const weatherBy = new Map(input.weather.map((w) => [w.roundNo, w]));
  const mainOf = (r: number) => weatherBy.get(r)?.main ?? defaultMainWeather(r);
  const subOf = (r: number) => weatherBy.get(r)?.sub ?? null;

  const rounds: RoundSummary[] = [];
  for (let r = 1; r <= played; r++) {
    const teams = perRound[r - 1];
    const round = roundByNo.get(r);
    const winner = teams ? [...teams.values()].find((t) => t.placement === 1) : undefined;
    rounds.push({
      roundNo: r,
      gameId: round?.gameId ?? null,
      source: round?.source ?? "csv",
      teamCount: teams?.size ?? 0,
      winner: winner?.name ?? null,
      main: mainOf(r),
      sub: subOf(r),
    });
  }

  const bansByRound = new Map<number, Set<string>>();
  const picks: GroupResult["picks"] = [];
  for (let r = 1; r <= played; r++) {
    const round = roundByNo.get(r);
    if (!round || round.source !== "csv") continue;
    const counts = new Map<string, number>();
    for (const p of round.players) if (p.character) counts.set(p.character, (counts.get(p.character) ?? 0) + 1);
    const list = [...counts.entries()]
      .map(([character, count]) => ({ character, count, banRounds: rules.bans ? banRoundsFor(count) : 0 }))
      .sort((a, b) => b.count - a.count || byText(a.character, b.character));
    picks.push({ roundNo: r, counts: list });
    for (const c of list) {
      for (let k = 1; k <= c.banRounds; k++) {
        const set = bansByRound.get(r + k) ?? new Set<string>();
        set.add(c.character);
        bansByRound.set(r + k, set);
      }
    }
  }

  let next: NextRound | null = null;
  const nextNo = played + 1;
  if (!ended && nextNo <= input.plannedRounds) {
    const cycleStart = Math.floor((nextNo - 1) / SUB_WEATHERS.length) * SUB_WEATHERS.length + 1;
    const used = new Set<string>();
    for (let r = cycleStart; r < nextNo; r++) {
      const s = subOf(r);
      if (s) used.add(s);
    }
    next = {
      roundNo: nextNo,
      main: mainOf(nextNo),
      sub: subOf(nextNo),
      subRemaining: rules.subWeather ? SUB_WEATHERS.filter((s) => !used.has(s)) : [],
      bans: [...(bansByRound.get(nextNo) ?? [])],
      checkpoint: mode === "points" ? [] : standings.filter((s) => s.checkpoint).map((s) => s.name),
    };
  }

  type Acc = { nickname: string; team: string; rounds: number; kills: number; hunting: number; level: number };
  const acc = new Map<string, Acc>();
  for (let r = 1; r <= played; r++) {
    const round = roundByNo.get(r);
    if (!round || round.source !== "csv") continue;
    for (const p of round.players) {
      if (!p.nickname) continue;
      const id = normalize(p.nickname);
      const teamKey = nickTeam.get(id);
      const team = teamKey ? (names.get(teamKey) ?? p.team) : rename(p.team.trim());
      const a = acc.get(id) ?? { nickname: p.nickname, team, rounds: 0, kills: 0, hunting: 0, level: 0 };
      a.rounds++;
      a.kills += p.kills;
      a.hunting += p.hunting;
      a.level += p.level;
      a.team = team;
      acc.set(id, a);
    }
  }
  const top = (pick: (a: Acc) => number) =>
    rank([...acc.values()].filter((a) => a.rounds > 0), (a) => round2(pick(a) / a.rounds))
      .filter((a) => a.rank <= 3)
      .map((a) => ({ nickname: a.nickname, team: a.team, value: a.value, rank: a.rank }));

  return {
    standings,
    rounds,
    played,
    next,
    ended,
    picks,
    players: { kills: top((a) => a.kills), hunting: top((a) => a.hunting), level: top((a) => a.level) },
  };
}

export { MAIN_WEATHERS, SUB_WEATHERS };
