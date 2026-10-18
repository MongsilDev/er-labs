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
  rankScore: number;
  score: number;
};

export const barTotal = (s: { rounds: (TeamRound | null)[] }) => s.rounds.reduce((a, r) => a + Math.max(0, r?.score ?? 0), 0);

export type Standing = {
  key: string;
  base: string;
  name: string;
  rank: number;
  delta: number;
  rounds: (TeamRound | null)[];
  roundScore: number;
  killScore: number;
  kills: number;
  rankScore: number;
  wins: number;
  penalty: number;
  total: number;
  lastPlacement: number | null;
  checkpoint: boolean;
  fixed: number | null;
  tiedBy: "killScore" | "kills" | "rankScore" | "wins" | "lastPlacement" | null;
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
  displayOf: Record<string, string>;
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
type Raw = Omit<Agg, "key" | "score" | "rankScore"> & { round: number; source: RoundInput["source"]; base: string };

function collect(round: RoundInput): Map<string, Raw> {
  const byName = new Map<string, Raw>();
  for (const p of round.players) {
    const name = p.team.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const id = normalize(name);
    const a: Raw = byName.get(id) ?? {
      round: round.roundNo,
      source: round.source,
      name,
      base: name,
      placement: null,
      killScore: 0,
      kills: 0,
      nicknames: new Set<string>(),
      csvTotal: -Infinity,
    };
    a.csvTotal = Math.max(a.csvTotal, p.totalScore);
    a.killScore = Math.max(a.killScore, p.killScore);
    a.kills = Math.max(a.kills, p.teamKills || 0);
    if (p.placement !== null) a.placement = a.placement === null ? p.placement : Math.min(a.placement, p.placement);
    if (p.nickname) a.nicknames.add(normalize(p.nickname));
    byName.set(id, a);
  }
  return byName;
}

const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
};

function assignBases(raws: Raw[]) {
  const named = raws.filter((r) => !DEFAULT_TEAM.test(r.name));
  const unresolved: Raw[] = [];
  for (const d of raws) {
    if (!DEFAULT_TEAM.test(d.name)) continue;
    let best: Raw | null = null;
    let bestScore = 0;
    for (const n of named) {
      if (n.round === d.round) continue;
      const o = overlap(d.nicknames, n.nicknames);
      if (o < 2) continue;
      const score = o * 1000 - Math.abs(n.round - d.round);
      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    }
    if (best) d.base = best.name;
    else unresolved.push(d);
  }
  const parent = unresolved.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < unresolved.length; i++) {
    for (let j = i + 1; j < unresolved.length; j++) {
      if (unresolved[i].round !== unresolved[j].round && overlap(unresolved[i].nicknames, unresolved[j].nicknames) >= 2) {
        parent[find(i)] = find(j);
      }
    }
  }
  const clusters = new Map<number, Raw[]>();
  unresolved.forEach((r, i) => clusters.set(find(i), [...(clusters.get(find(i)) ?? []), r]));
  for (const members of clusters.values()) {
    const first = members.reduce((a, b) => (b.round < a.round ? b : a));
    for (const m of members) m.base = `${first.round}R ${first.name}`;
  }
}

function score(a: Raw, rules: Rules) {
  const table = a.source === "manual" || rules.scoreSource === "table";
  const points = a.placement === null ? 0 : (rules.placementPoints[a.placement - 1] ?? 0);
  return {
    score: round2(table ? points + a.killScore * rules.killMultiplier : a.csvTotal),
    rankScore: round2(table ? points : Math.max(0, a.csvTotal - a.killScore)),
  };
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
  const recorded = new Set(ordered.map((r) => r.roundNo)).size;
  const perRound: (Map<string, Agg> | null)[] = Array(played).fill(null);
  const roundByNo = new Map(ordered.map((r) => [r.roundNo, r]));
  const names = new Map<string, string>();
  const baseOf = new Map<string, string>();
  const displayOf: Record<string, string> = {};
  const nickTeam = new Map<string, string>();

  const raws: Raw[] = [];
  for (const round of ordered) raws.push(...collect(round).values());
  assignBases(raws);

  for (const a of raws) {
    const display = rename(a.base);
    const key = normalize(display);
    displayOf[normalize(a.base)] = display;
    if (!names.has(key)) names.set(key, display);
    if (!baseOf.has(key)) baseOf.set(key, a.base);
    const teams = (perRound[a.round - 1] ??= new Map<string, Agg>());
    const sc = score(a, rules);
    const prev = teams.get(key);
    if (prev) {
      prev.score = Math.max(prev.score, sc.score);
      prev.rankScore = Math.max(prev.rankScore, sc.rankScore);
      prev.killScore = Math.max(prev.killScore, a.killScore);
      prev.kills = Math.max(prev.kills, a.kills);
      if (a.placement !== null) prev.placement = prev.placement === null ? a.placement : Math.min(prev.placement, a.placement);
      for (const n of a.nicknames) prev.nicknames.add(n);
    } else {
      teams.set(key, { ...a, name: display, key, ...sc, nicknames: new Set(a.nicknames) });
    }
    for (const n of a.nicknames) nickTeam.set(n, key);
  }
  const penalties = input.penalties.map((p) => ({ ...p, key: normalize(rename(p.team)) }));
  for (const p of penalties) {
    if (!names.has(p.key)) names.set(p.key, rename(p.team));
    if (!baseOf.has(p.key)) baseOf.set(p.key, p.team);
  }
  const overrides = Object.entries(input.overrides).map(([k, v]) => ({
    round: Number(k.split(":")[0]),
    key: normalize(rename(k.slice(k.indexOf(":") + 1))),
    on: v,
  }));

  const keys = [...names.keys()];
  const roundsOf = (key: string) => perRound.map((m) => (m?.get(key) as TeamRound | undefined) ?? null);

  type Row = { key: string; total: number; killScore: number; kills: number; rankScore: number; wins: number; last: number | null; ruleFree: number };
  const totalsAfter = (r: number): Row[] =>
    keys.map((key) => {
      const rs = roundsOf(key).slice(0, r);
      const sum = rs.reduce((a, x) => a + (x?.score ?? 0), 0);
      const pen = penalties.filter((p) => p.key === key && p.roundNo <= r);
      const all = pen.reduce((a, p) => a + penaltyPoints(p, rules), 0);
      const ruleNow = pen.filter((p) => p.kind === "rule" && p.roundNo === r && r > 0).reduce((a, p) => a + p.points, 0);
      const last = [...rs].reverse().find((x) => x !== null);
      return {
        key,
        total: round2(sum - all),
        killScore: round2(rs.reduce((a, x) => a + (x?.killScore ?? 0), 0)),
        kills: rs.reduce((a, x) => a + (x?.kills ?? 0), 0),
        rankScore: round2(rs.reduce((a, x) => a + (x?.rankScore ?? 0), 0)),
        wins: rs.filter((x) => x?.placement === 1).length,
        last: last?.placement ?? null,
        ruleFree: round2(sum - all + ruleNow),
      };
    });

  const primary = rules.tiebreak;
  const compare = (a: Row, b: Row) =>
    b.total - a.total ||
    b[primary] - a[primary] ||
    (primary === "killScore" ? b.kills - a.kills : b.killScore - a.killScore) ||
    (a.last ?? 99) - (b.last ?? 99) ||
    byText(names.get(a.key) ?? "", names.get(b.key) ?? "");

  const fixed: { key: string; round: number }[] = [];
  let status = new Set<string>();
  const statusAt: Set<string>[] = [];
  let ended = mode === "points" ? recorded >= input.plannedRounds && recorded > 0 : false;
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
      for (const o of overrides) {
        if (o.round !== r) continue;
        if (o.on) next.add(o.key);
        else next.delete(o.key);
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
    if (recorded >= input.plannedRounds && recorded > 0) ended = true;
  }

  const now = orderFor(played, totalsAfter(played));
  const prev = played > 1 ? orderFor(played - 1, totalsAfter(played - 1)) : null;
  const finalStatus = statusAt[played] ?? new Set<string>();

  const standings: Standing[] = now.map((x, i) => {
    const rs = roundsOf(x.key);
    const pi = prev ? prev.findIndex((p) => p.key === x.key) : -1;
    const fixedIndex = fixed.findIndex((f) => f.key === x.key);
    const isTied = (o: (typeof now)[number] | undefined) => o !== undefined && o.total === x.total && !fixed.some((f) => f.key === o.key);
    const neighbor = isTied(now[i - 1]) ? now[i - 1] : isTied(now[i + 1]) ? now[i + 1] : undefined;
    let tiedBy: Standing["tiedBy"] = null;
    if (fixedIndex < 0 && neighbor) {
      const second = primary === "killScore" ? "kills" : "killScore";
      tiedBy = neighbor[primary] !== x[primary] ? primary : neighbor[second] !== x[second] ? second : "lastPlacement";
    }
    return {
      key: x.key,
      base: baseOf.get(x.key) ?? names.get(x.key) ?? x.key,
      name: names.get(x.key) ?? x.key,
      rank: i + 1,
      delta: pi >= 0 ? pi - i : 0,
      rounds: rs,
      roundScore: round2(rs.reduce((a, r) => a + (r?.score ?? 0), 0)),
      killScore: x.killScore,
      kills: x.kills,
      rankScore: x.rankScore,
      wins: x.wins,
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
  let nextNo = 1;
  while (roundByNo.has(nextNo)) nextNo++;
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
    displayOf,
    rounds,
    played,
    next,
    ended,
    picks,
    players: { kills: top((a) => a.kills), hunting: top((a) => a.hunting), level: top((a) => a.level) },
  };
}

export { MAIN_WEATHERS, SUB_WEATHERS };
