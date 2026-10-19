import achievementsData from "@/data/achievements.json";
import levels from "@/data/levels.json";

// players.tarkov.dev 프로필 JSON에서 화면과 판정에 쓰는 숫자만 뽑음. 없는 필드는 null

type Achievement = { name: string; rarity: string; percent: number; hidden: boolean };
const ACHIEVEMENTS = achievementsData as Record<string, Achievement>;

export const FLAGS = { developer: 1, eod: 2, moderator: 32, sherpa: 256, emissary: 512, unheard: 1024 } as const;

export type Base = {
  aid: number;
  name: string;
  side: string | null;
  member: number;
  updated: number;
  achievements: { id: string; at: number }[];
};

export type EftSummary = Base & {
  kind: "eft";
  level: number | null;
  prestige: number | null;
  seconds: number | null;
  raids: number | null;
  survived: number | null;
  kia: number | null;
  mia: number | null;
  runner: number | null;
  transit: number | null;
  kills: number | null;
  pmcKills: number | null;
  deaths: number | null;
  streak: number | null;
  lastActive: number | null;
};

export type ArenaModeStats = {
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  maxGameKills: number;
  killStreak: number;
  teamKills: number;
  roundMvp: number;
  matchMvp: number;
  aces: number;
  damage: number;
};

export type ArenaSummary = Base & {
  kind: "arena";
  seconds: number | null;
  registered: number | null;
  total: ArenaModeStats | null;
  modes: { key: string; stats: ArenaModeStats }[];
};

export type Summary = EftSummary | ArenaSummary;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function levelFromExp(exp: number | null): number | null {
  if (exp == null || exp < 0) return null;
  let lv = 0;
  for (let i = 0; i < levels.length && levels[i] <= exp; i++) lv = i + 1;
  return lv || null;
}

function base(p: Record<string, unknown>): Base {
  const info = obj(p.info);
  const ach = Object.entries(obj(p.achievements))
    .map(([id, at]) => ({ id, at: num(at) ?? 0 }))
    .sort((a, b) => b.at - a.at);
  return {
    aid: num(p.aid) ?? 0,
    name: typeof info.nickname === "string" ? info.nickname : "",
    side: typeof info.side === "string" ? info.side : null,
    member: num(info.memberCategory) ?? 0,
    updated: num(p.updated) ?? 0,
    achievements: ach,
  };
}

export function parseEft(raw: unknown): EftSummary {
  const p = obj(raw);
  const info = obj(p.info);
  const eft = obj(obj(p.pmcStats).eft);
  const counters = new Map<string, number>();
  for (const it of arr(obj(eft.overAllCounters).Items)) {
    const o = obj(it);
    const v = num(o.Value);
    if (Array.isArray(o.Key) && v != null) counters.set(o.Key.join("/"), v);
  }
  const c = (k: string) => counters.get(k) ?? null;
  const b = base(p);

  let last = 0;
  for (const s of arr(obj(p.skills).Common)) last = Math.max(last, num(obj(s).LastAccess) ?? 0);
  for (const a of b.achievements) last = Math.max(last, a.at);

  return {
    ...b,
    kind: "eft",
    level: levelFromExp(num(info.experience)),
    prestige: num(info.prestigeLevel),
    seconds: num(eft.totalInGameTime),
    raids: c("Sessions/Pmc"),
    survived: c("ExitStatus/Survived/Pmc"),
    kia: c("ExitStatus/Killed/Pmc"),
    mia: c("ExitStatus/Left/Pmc"),
    runner: c("ExitStatus/Runner/Pmc"),
    transit: c("ExitStatus/Transit/Pmc"),
    kills: c("Kills"),
    pmcKills: c("KilledPmc"),
    deaths: c("Deaths"),
    streak: c("LongestWinStreak/Pmc"),
    lastActive: last > 0 ? last : null,
  };
}

function arenaStats(raw: unknown): ArenaModeStats {
  const c = obj(raw);
  const n = (k: string) => num(c[k]) ?? 0;
  return {
    games: n("GamesCount"),
    wins: n("ArenaWins"),
    losses: n("ArenaLoses"),
    kills: n("Kills"),
    deaths: n("Deaths"),
    assists: n("Assists"),
    headshots: n("Headshots"),
    maxGameKills: n("MaxGameKillsCount"),
    killStreak: n("LongestKillStreak"),
    teamKills: n("TeammateKills"),
    roundMvp: n("RoundMvpCount"),
    matchMvp: n("MatchMvpCount"),
    aces: n("Ace"),
    damage: n("DamageDealt"),
  };
}

const SUM: (keyof ArenaModeStats)[] = ["games", "wins", "losses", "kills", "deaths", "assists", "headshots", "teamKills", "roundMvp", "matchMvp", "aces", "damage"];
const MAX: (keyof ArenaModeStats)[] = ["maxGameKills", "killStreak"];

export function parseArena(raw: unknown): ArenaSummary {
  const p = obj(raw);
  const info = obj(p.info);
  const stat = obj(p.stat);
  // Overall에는 카운터가 9개뿐이라 모드별 값을 직접 합침
  const modes = Object.entries(obj(stat.arenaOverAllCounters))
    .filter(([k]) => !k.endsWith("Overall"))
    .map(([key, v]) => ({ key, stats: arenaStats(obj(v).Counters) }))
    .filter((m) => m.stats.games > 0)
    .sort((a, b) => b.stats.games - a.stats.games);
  let total: ArenaModeStats | null = null;
  if (modes.length) {
    total = arenaStats({});
    for (const m of modes) {
      for (const k of SUM) total[k] += m.stats[k];
      for (const k of MAX) total[k] = Math.max(total[k], m.stats[k]);
    }
  }
  return {
    ...base(p),
    kind: "arena",
    seconds: num(stat.totalInGameTime),
    registered: num(info.registrationDate),
    total,
    modes,
  };
}

export const parse = (folder: string, raw: unknown): Summary => (folder === "arena" ? parseArena(raw) : parseEft(raw));

export const achievementInfo = (id: string): Achievement | undefined => ACHIEVEMENTS[id];

export const ratio = (a: number | null, b: number | null): number | null => (a == null || b == null ? null : b > 0 ? a / b : a > 0 ? a : null);
