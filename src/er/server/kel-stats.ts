import "server-only";
import { byCharacter, byText } from "@/er/lib/format";
import { EVENT_NAME, KEL_EVENTS, TEAM, type KelEvent } from "@/er/lib/kel";
import { finalState, placementPoints, type FinalState, type Round } from "@/er/lib/kel-calc";
import { CIRCUIT_STAGES, stageRounds, type Kel, type KelRow } from "./kel";
import type { KelDak } from "./kel-dakgg";

type DakRow = KelRow & { dak: KelDak };
const withDak = (rows: KelRow[]) => rows.filter((r): r is DakRow => Boolean(r.dak));

// 선수끼리 견주는 순위는 30게임 이상 나온 선수만
export const MIN_GAMES = 30;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const count = (rows: { gameId: number }[]) => new Set(rows.map((r) => r.gameId)).size;

// kelData가 같은 객체를 돌려주는 동안 계산 결과를 다시 씀
function memo<T>(f: (data: Kel) => T): (data: Kel) => T {
  const cache = new WeakMap<Kel, T>();
  return (data) => {
    if (!cache.has(data)) cache.set(data, f(data));
    return cache.get(data)!;
  };
}

export function top<T>(list: T[], value: (x: T) => number, tie: (x: T) => number = () => 0): T {
  return list.reduce((a, x) => (value(x) > value(a) || (value(x) === value(a) && tie(x) > tie(a)) ? x : a));
}


export const gameLabel = (g: { event: KelEvent; stage: string; round: number }) => `${EVENT_NAME[g.event]} ${g.stage} ${g.round}R`;

export type StyleScope = "season" | "c4" | "finals";

export type TeamStyle = { team: string; games: number; wins: number; top3: number; rankPerGame: number; killPerGame: number; killShare: number; perGame: number };

export function teamStyles(data: Kel, scope: StyleScope): TeamStyle[] {
  const games = data.games.filter((g) => (scope === "c4" ? g.event === "c4" : scope === "finals" ? g.stage === "결승" : true));
  return [...Map.groupBy(games, (g) => g.team)]
    .map(([team, list]) => {
      const rank = list.reduce((a, g) => a + placementPoints(g.placement), 0);
      const kill = list.reduce((a, g) => a + g.killScore, 0);
      return {
        team,
        games: list.length,
        wins: list.filter((g) => g.placement === 1).length,
        top3: list.filter((g) => g.placement <= 3).length / list.length,
        rankPerGame: rank / list.length,
        killPerGame: kill / list.length,
        killShare: rank + kill > 0 ? kill / (rank + kill) : 0,
        perGame: (rank + kill) / list.length,
      };
    })
    .sort((a, b) => b.perGame - a.perGame);
}

export type PlayerStat = {
  name: string;
  team: string;
  games: number;
  wins: number;
  kpr: number;
  kills: number;
  deaths: number;
  top3: number;
  avgPlace: number;
  damage: number;
  damageShare: number;
  takenShare: number;
  cc: number;
  heal: number;
  vision: number;
  camera: number;
  cameraOff: number;
  revive: number;
  time: number;
  ccShare: number;
  healShare: number;
  characters: [string, number][];
  bests: { kills: KelRow; damage: KelRow; cc: DakRow | null; heal: DakRow | null };
};

// 경기 상세 값은 상세가 있는 게임만 평균하고, 팀 합계가 0인 게임은 비중에서 뺌
export const playerStats = memo((data): PlayerStat[] => {
  const teamGame = new Map(data.games.map((g) => [`${g.gameId}:${g.team}`, g]));
  return [...Map.groupBy(data.rows, (r) => r.player)].map(([name, rows]) => {
    const dak = withDak(rows);
    const avg = (value: (d: KelDak) => number) => mean(dak.map((r) => value(r.dak)));
    const shares = rows.map((r) => {
      const g = teamGame.get(`${r.gameId}:${r.team}`);
      return {
        damage: g?.damage ? r.damage / g.damage : 0,
        taken: g?.taken ? r.taken / g.taken : 0,
        cc: r.dak && g?.cc ? r.dak.cc / g.cc : [],
        heal: r.dak && g?.heal ? r.dak.heal / g.heal : [],
      };
    });
    return {
      name,
      team: rows[0].team,
      games: rows.length,
      wins: rows.filter((r) => r.placement === 1).length,
      kpr: mean(rows.map((r) => r.kpr)),
      kills: mean(rows.map((r) => r.kills)),
      deaths: mean(rows.map((r) => r.deaths)),
      top3: rows.filter((r) => r.placement <= 3).length / rows.length,
      avgPlace: mean(rows.map((r) => r.placement)),
      damage: mean(rows.map((r) => r.damage)),
      damageShare: mean(shares.map((x) => x.damage)),
      takenShare: mean(shares.map((x) => x.taken)),
      cc: avg((d) => d.cc),
      heal: avg((d) => d.heal),
      vision: avg((d) => d.vision),
      camera: avg((d) => d.camera),
      cameraOff: avg((d) => d.cameraOff),
      revive: avg((d) => d.revive),
      time: avg((d) => d.time),
      ccShare: mean(shares.flatMap((x) => x.cc)),
      healShare: mean(shares.flatMap((x) => x.heal)),
      characters: [...Map.groupBy(rows, (r) => r.character)].map(([k, v]): [string, number] => [k, v.length]).sort((a, b) => b[1] - a[1] || byCharacter(a[0], b[0])),
      bests: {
        kills: top(
          rows,
          (r) => r.kills,
          (r) => r.damage,
        ),
        damage: top(rows, (r) => r.damage),
        cc: dak.length ? top(dak, (r) => r.dak.cc) : null,
        heal: dak.length ? top(dak, (r) => r.dak.heal) : null,
      },
    };
  });
});

export type Metric = "kpr" | "kills" | "deaths" | "top3" | "avgPlace" | "damage" | "damageShare" | "cc" | "heal" | "vision" | "camera" | "revive" | "time";

// 평균 순위와 데스는 작을수록 위
const LOWER = new Set<Metric>(["avgPlace", "deaths"]);

export function rankOf(players: PlayerStat[], p: PlayerStat, metric: Metric): number | null {
  if (p.games < MIN_GAMES) return null;
  const sign = LOWER.has(metric) ? -1 : 1;
  const better = (x: PlayerStat) => x.games >= MIN_GAMES && sign * x[metric] > sign * p[metric];
  return 1 + players.filter(better).length;
}

export type CharacterStat = { key: string; games: number; rate: number; byEvent: Record<KelEvent, number>; avgPlace: number; winRate: number };

export function characterStats(data: Kel): { total: number; eventGames: Record<KelEvent, number>; rows: CharacterStat[] } {
  const byEvent = Map.groupBy(data.rows, (r) => r.event);
  const eventGames = Object.fromEntries(KEL_EVENTS.map((e) => [e.key, count(byEvent.get(e.key) ?? [])])) as Record<KelEvent, number>;
  const total = count(data.rows);
  const rows = [...Map.groupBy(data.rows, (r) => r.character)].map(([key, list]) => {
    const ev = Map.groupBy(list, (r) => r.event);
    const games = count(list);
    return {
      key,
      games,
      rate: games / total,
      byEvent: Object.fromEntries(KEL_EVENTS.map((e) => [e.key, eventGames[e.key] ? count(ev.get(e.key) ?? []) / eventGames[e.key] : 0])) as Record<KelEvent, number>,
      avgPlace: mean(list.map((r) => r.placement)),
      winRate: list.filter((r) => r.placement === 1).length / list.length,
    };
  });
  return { total, eventGames, rows };
}

export type Comp = { characters: string[]; count: number; avgPlace: number; wins: number; teams: [string, number][] };

export function comps(data: Kel, min: number): Comp[] {
  const full = data.games.filter((g) => g.characters.length === 3);
  return [...Map.groupBy(full, (g) => [...g.characters].sort().join("|"))]
    .filter(([, list]) => list.length >= min)
    .map(([key, list]) => ({
      characters: key.split("|").sort(byCharacter),
      count: list.length,
      avgPlace: mean(list.map((g) => g.placement)),
      wins: list.filter((g) => g.placement === 1).length,
      teams: [...Map.groupBy(list, (g) => g.team)]
        .map(([t, v]): [string, number] => [t, v.length])
        .sort((a, b) => b[1] - a[1] || byText(TEAM.get(a[0])!.name, TEAM.get(b[0])!.name)),
    }))
    .sort((a, b) => b.count - a.count || a.avgPlace - b.avgPlace);
}

const STAGE_ORDER: readonly string[] = CIRCUIT_STAGES;
// 같은 값의 기록이 경기 순서대로 나오도록 날짜, 단계, 라운드 순으로 미리 정렬
const inOrder = (rows: KelRow[]) =>
  [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.round - b.round));

export const records = memo((data) => {
  const rows = inOrder(data.rows);
  const low = rows.filter((r) => r.placement >= 7);
  const dak = withDak(rows);
  const best = (value: (d: KelDak) => number) => (dak.length ? top(dak, (r) => value(r.dak)) : null);
  return {
    cc: best((d) => d.cc),
    heal: best((d) => d.heal),
    camera: best((d) => d.camera),
    vision: best((d) => d.vision),
    kills: top(
      rows,
      (r) => r.kills,
      (r) => r.damage,
    ),
    damage: ranked(rows, (r) => r.damage),
    taken: top(rows, (r) => r.taken),
    lowTeamDamage: low.length ? top(low, (r) => r.damage) : null,
    teamKills: top(data.games, (g) => g.kills),
    characters: [...Map.groupBy(rows, (r) => r.character)]
      .map(([key, list]) => ({
        key,
        kills: top(
          list,
          (r) => r.kills,
          (r) => r.damage,
        ),
        damage: top(list, (r) => r.damage),
      }))
      .sort((a, b) => byCharacter(a.key, b.key)),
  };
});

export type Records = ReturnType<typeof records>;

// n위 안의 기록을 같은 값은 같은 순위로 모두 넣음
export function ranked<T>(list: T[], value: (x: T) => number, n = 5): { r: T; rank: number }[] {
  const sorted = [...list].sort((a, b) => value(b) - value(a));
  const out: { r: T; rank: number }[] = [];
  for (const r of sorted) {
    const prev = out.at(-1);
    const rank = prev && value(prev.r) === value(r) ? prev.rank : out.length + 1;
    if (rank > n) break;
    out.push({ r, rank });
  }
  return out;
}

export const lows = memo((data) => {
  const rows = inOrder(data.rows);
  return { damage: ranked(rows, (r) => -r.damage), deaths: ranked(rows, (r) => r.deaths) };
});

export type KillPair = { killer: KelRow; victim: KelRow; count: number };

// 킬 기록에는 잡힌 실험체만 남음. 같은 실험체를 고른 상대가 둘 이상이면 그 상대들의 데스 기록으로 가리고, 그래도 한 명으로 못 정한 킬은 셈에서 뺌
export const killStats = memo((data) => {
  let total = 0;
  const pairs = new Map<string, KillPair>();
  const teams = new Map<string, number>();
  for (const rows of Map.groupBy(withDak(data.rows), (r) => r.gameId).values()) {
    for (const k of rows) {
      for (const [num, count] of Object.entries(k.dak.killed)) {
        total += count;
        let v = rows.filter((r) => r.team !== k.team && String(r.dak.num) === num);
        if (v.length > 1) v = v.filter((r) => String(k.dak.num) in r.dak.killedBy);
        if (v.length !== 1) continue;
        const key = `${k.player}|${v[0].player}`;
        const pair = pairs.get(key) ?? { killer: k, victim: v[0], count: 0 };
        pair.count += count;
        pairs.set(key, pair);
        const t = `${k.team}|${v[0].team}`;
        teams.set(t, (teams.get(t) ?? 0) + count);
      }
    }
  }
  const together = new Map<string, number>();
  for (const list of Map.groupBy(data.games, (g) => g.gameId).values()) {
    for (const a of list) for (const b of list) if (a !== b) together.set(`${a.team}|${b.team}`, (together.get(`${a.team}|${b.team}`) ?? 0) + 1);
  }
  const list = [...pairs.values()];
  return { total, counted: list.reduce((a, p) => a + p.count, 0), pairs: list, teams, together };
});

// 팀 선수 가운데 누구라도 위클라인을 처치한 게임 수, 경기 상세가 없는 게임은 세지 않음
export function wicklines(data: Kel): { team: string; count: number; games: number }[] {
  const games = data.games.filter((g) => g.wickline !== undefined);
  if (!games.some((g) => g.wickline)) return [];
  return [...Map.groupBy(games, (g) => g.team)]
    .map(([team, list]) => ({ team, games: list.length, count: list.filter((g) => g.wickline).length }))
    .sort((a, b) => b.count - a.count || a.games - b.games);
}

// 오프닝 위크는 결승이 없어 빠짐
const FINAL_ORDER = [...KEL_EVENTS].reverse().map((e) => e.key);

export type Final = { event: KelEvent; teams: string[]; rounds: Round[]; state: FinalState };

export function finals(data: Kel): Final[] {
  return FINAL_ORDER.flatMap((event) => {
    const { teams, rounds: all } = stageRounds(data, event, "결승");
    if (!teams.length) return [];
    const end = all.findIndex((r) => !r);
    const rounds = end < 0 ? all : all.slice(0, end);
    return [{ event, teams, rounds, state: finalState(teams, rounds) }];
  });
}
