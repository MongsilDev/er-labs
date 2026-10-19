import type { Sample } from "./criteria";
import type { ArenaModeStats, Summary } from "./summary";

export const modeSample = (m: ArenaModeStats): Sample => ({
  hours: 0,
  n: m.games,
  kills: m.kills,
  deaths: m.deaths,
  survived: m.wins,
  streak: m.bestKillStreak ?? 0,
  headshots: m.headshots,
  maxGameKills: m.maxGameKills,
});

export function toSample(s: Summary): Sample | null {
  if (s.kind === "arena") {
    if (!s.total || s.seconds == null) return null;
    const t = s.total;
    return { hours: s.seconds / 3600, n: t.games, kills: t.kills, deaths: t.deaths, survived: t.wins, streak: t.bestKillStreak ?? 0, headshots: t.headshots, maxGameKills: t.maxGameKills };
  }
  if (s.raids == null || s.seconds == null) return null;
  return {
    hours: s.seconds / 3600,
    n: s.raids,
    kills: s.pmcKills ?? 0,
    deaths: s.kia ?? 0,
    survived: s.survived ?? 0,
    streak: s.streak ?? 0,
    headshots: 0,
    maxGameKills: 0,
  };
}
