import "server-only";
import { byCharacter, byText } from "@/er/lib/format";
import { EVENT_NAME, KEL_EVENTS, TEAM, type KelEvent } from "@/er/lib/kel";
import { finalState, placementPoints, type FinalState, type Round } from "@/er/lib/kel-calc";
import { stageRounds, type Kel, type KelRow } from "./kel";

// 선수끼리 견주는 순위는 30게임 이상 나온 선수만
export const MIN_GAMES = 30;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const count = (rows: { gameId: number }[]) => new Set(rows.map((r) => r.gameId)).size;

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

export function records(data: Kel) {
  const low = data.rows.filter((r) => r.placement >= 7);
  return {
    kills: top(
      data.rows,
      (r) => r.kills,
      (r) => r.damage,
    ),
    damage: [...data.rows].sort((a, b) => b.damage - a.damage).slice(0, 5),
    taken: top(data.rows, (r) => r.taken),
    lowTeamDamage: low.length ? top(low, (r) => r.damage) : null,
    teamKills: top(data.games, (g) => g.kills),
    characters: [...Map.groupBy(data.rows, (r) => r.character)]
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
