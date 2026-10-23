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

export function top<T>(list: T[], value: (x: T) => number, tie: (x: T) => number = () => 0): T {
  return list.reduce((a, x) => (value(x) > value(a) || (value(x) === value(a) && tie(x) > tie(a)) ? x : a));
}


export const gameLabel = (g: { event: KelEvent; stage: string; round: number }) => `${EVENT_NAME[g.event]} ${g.stage} ${g.round}R`;

export type StyleScope = "season" | "c4" | "finals";

export type TeamStyle = { team: string; games: number; wins: number; eighth: number; top3: number; rankPerGame: number; killPerGame: number; killShare: number; perGame: number };

const inScope = (scope: StyleScope) => (g: { event: KelEvent; stage: string }) => (scope === "c4" ? g.event === "c4" : scope === "finals" ? g.stage === "결승" : true);

export function teamStyles(data: Kel, scope: StyleScope): TeamStyle[] {
  const games = data.games.filter(inScope(scope));
  return [...Map.groupBy(games, (g) => g.team)]
    .map(([team, list]) => {
      const rank = list.reduce((a, g) => a + placementPoints(g.placement), 0);
      const kill = list.reduce((a, g) => a + g.killScore, 0);
      return {
        team,
        games: list.length,
        wins: list.filter((g) => g.placement === 1).length,
        eighth: list.filter((g) => g.placement === 8).length,
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
  top3: number;
  avgPlace: number;
  damage: number;
  damageShare: number;
  takenShare: number;
  characters: [string, number][];
  best: KelRow;
};

export function playerStats(data: Kel): PlayerStat[] {
  const teamGame = new Map(data.games.map((g) => [`${g.gameId}:${g.team}`, g]));
  return [...Map.groupBy(data.rows, (r) => r.player)].map(([name, rows]) => {
    const shares = rows.map((r) => {
      const g = teamGame.get(`${r.gameId}:${r.team}`);
      return { damage: g?.damage ? r.damage / g.damage : 0, taken: g?.taken ? r.taken / g.taken : 0 };
    });
    return {
      name,
      team: rows[0].team,
      games: rows.length,
      wins: rows.filter((r) => r.placement === 1).length,
      kpr: mean(rows.map((r) => r.kpr)),
      kills: mean(rows.map((r) => r.kills)),
      top3: rows.filter((r) => r.placement <= 3).length / rows.length,
      avgPlace: mean(rows.map((r) => r.placement)),
      damage: mean(rows.map((r) => r.damage)),
      damageShare: mean(shares.map((x) => x.damage)),
      takenShare: mean(shares.map((x) => x.taken)),
      characters: [...Map.groupBy(rows, (r) => r.character)].map(([k, v]): [string, number] => [k, v.length]).sort((a, b) => b[1] - a[1] || byCharacter(a[0], b[0])),
      best: top(
        rows,
        (r) => r.kills,
        (r) => r.damage,
      ),
    };
  });
}

export type Metric = "kpr" | "kills" | "top3" | "avgPlace" | "damage" | "damageShare";

// 평균 순위만 작을수록 위
export function rankOf(players: PlayerStat[], p: PlayerStat, metric: Metric): number | null {
  if (p.games < MIN_GAMES) return null;
  const better = (x: PlayerStat) => x.games >= MIN_GAMES && (metric === "avgPlace" ? x[metric] < p[metric] : x[metric] > p[metric]);
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

// kelData가 같은 객체를 돌려주는 동안 계산 결과를 다시 씀
function memo<T>(f: (data: Kel) => T): (data: Kel) => T {
  const cache = new WeakMap<Kel, T>();
  return (data) => {
    if (!cache.has(data)) cache.set(data, f(data));
    return cache.get(data)!;
  };
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

// 5위 안의 기록을 같은 값은 같은 순위로 모두 넣음
function ranked<T>(list: T[], value: (x: T) => number): { r: T; rank: number }[] {
  const sorted = [...list].sort((a, b) => value(b) - value(a));
  const out: { r: T; rank: number }[] = [];
  for (const r of sorted) {
    const prev = out.at(-1);
    const rank = prev && value(prev.r) === value(r) ? prev.rank : out.length + 1;
    if (rank > 5) break;
    out.push({ r, rank });
  }
  return out;
}

export const lows = memo((data) => {
  const rows = inOrder(data.rows);
  return { damage: ranked(rows, (r) => -r.damage), deaths: ranked(rows, (r) => r.deaths) };
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

// weather는 라운드별 메인 날씨, 경기 상세가 없는 라운드는 빈 문자열
export type Final = { event: KelEvent; teams: string[]; rounds: Round[]; state: FinalState; weather: string[] };

export function finals(data: Kel): Final[] {
  const weather = new Map(withDak(data.rows).map((r) => [r.gameId, r.dak.weather]));
  return FINAL_ORDER.flatMap((event) => {
    const { teams, rounds: all } = stageRounds(data, event, "결승");
    if (!teams.length) return [];
    const end = all.findIndex((r) => !r);
    const rounds = end < 0 ? all : all.slice(0, end);
    const ids = new Map(data.games.filter((g) => g.event === event && g.stage === "결승").map((g) => [g.round, g.gameId]));
    return [{ event, teams, rounds, state: finalState(teams, rounds), weather: rounds.map((_, i) => weather.get(ids.get(i + 1) ?? 0) ?? "") }];
  });
}

export type TeamOps = {
  team: string;
  games: number;
  wickline: number;
  wicklinePlace: number | null;
  time: number;
  vision: number;
  camera: number;
  escaped: number;
  start: [string, number] | null;
};

// 지역별 비율이 큰 순서로 n곳, 같은 비율은 이름순
function favorites(rows: DakRow[], n: number): [string, number][] {
  return [...Map.groupBy(rows, (r) => r.dak.start)]
    .map(([area, list]): [string, number] => [area, list.length / rows.length])
    .sort((a, b) => b[1] - a[1] || byText(a[0], b[0]))
    .slice(0, n);
}

// 팀 성향 운영 보기, 경기 상세가 있는 팀 게임만 셈. ranks는 위클라인을 잡은 팀의 순위별 게임 수
export function teamOps(data: Kel, scope: StyleScope): { rows: TeamOps[]; ranks: number[] } {
  const rows = withDak(data.rows).filter(inScope(scope));
  const ranks = Array.from({ length: 8 }, () => 0);
  const out = [...Map.groupBy(rows, (r) => r.team)].map(([team, list]): TeamOps => {
    const games = [...Map.groupBy(list, (r) => r.gameId).values()];
    const wick = games.filter((g) => g.some((r) => r.dak.wickline));
    for (const g of wick) ranks[g[0].placement - 1]++;
    const sum = (g: DakRow[], value: (d: KelDak) => number) => g.reduce((a, r) => a + value(r.dak), 0);
    return {
      team,
      games: games.length,
      wickline: wick.length,
      wicklinePlace: wick.length ? mean(wick.map((g) => g[0].placement)) : null,
      time: mean(games.map((g) => Math.max(...g.map((r) => r.dak.time)))),
      vision: mean(games.map((g) => sum(g, (d) => d.vision))),
      camera: mean(games.map((g) => sum(g, (d) => d.camera))),
      escaped: games.filter((g) => g.every((r) => r.dak.escaped)).length,
      start: favorites(
        list.filter((r) => r.dak.start),
        1,
      )[0] ?? null,
    };
  });
  return { rows: out, ranks };
}

// 시작 지역 표는 이보다 많이 시작한 지역만 넣음
export const MIN_STARTS = 40;

// 시작 지역은 선수 한 명이 한 게임에서 시작한 기록 하나로 셈
export function regions(data: Kel) {
  const rows = withDak(data.rows);
  const started = rows.filter((r) => r.dak.start);
  const starts = [...Map.groupBy(started, (r) => r.dak.start)]
    .map(([area, list]) => ({ area, count: list.length, avgPlace: mean(list.map((r) => r.placement)), top3: list.filter((r) => r.placement <= 3).length / list.length }))
    .sort((a, b) => a.avgPlace - b.avgPlace || b.count - a.count);
  const deaths = new Map<string, number>();
  for (const r of rows) for (const area of r.dak.deathPlaces) deaths.set(area, (deaths.get(area) ?? 0) + 1);
  return {
    starts,
    deaths: [...deaths]
      .map(([area, count]) => ({ area, count, starts: starts.find((s) => s.area === area)?.count ?? 0 }))
      .sort((a, b) => b.count - a.count || byText(a.area, b.area)),
    teams: [...Map.groupBy(started, (r) => r.team)].map(([team, list]) => ({ team, areas: favorites(list, 3) })),
    players: [...Map.groupBy(started, (r) => r.player)]
      .filter(([, list]) => list.length >= MIN_GAMES)
      .map(([name, list]) => ({ name, team: list[0].team, games: list.length, areas: favorites(list, 3) })),
  };
}
