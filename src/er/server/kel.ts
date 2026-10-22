import "server-only";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import characters from "@/er/data/characters.json";
import { parseCsv } from "@/er/lib/csv";
import { KEL_SCREENS, TEAM_BY_CSV, type KelEvent, type KelScreen } from "@/er/lib/kel";
import type { KillPool, Round } from "@/er/lib/kel-calc";
import { currentUser, type User } from "./auth";

const viewer = cache(async (): Promise<{ user: User | null; owner: boolean }> => {
  const user = await currentUser();
  const id = process.env.KEL_OWNER_ID;
  return { user, owner: Boolean(id && user && user.id === id) };
});

// 스트리밍이 시작되기 전에 불러야 404 상태 코드가 나감
export async function kelGate(screen: KelScreen) {
  const v = await viewer();
  if (!v.owner && !KEL_SCREENS[screen].public) notFound();
  return v;
}

export async function kelMetadata(screen: KelScreen): Promise<Metadata> {
  const { owner } = await viewer();
  if (!owner && !KEL_SCREENS[screen].public) return {};
  return { title: KEL_SCREENS[screen].title, robots: { index: false, follow: false } };
}

export type KelRow = {
  event: KelEvent;
  stage: string;
  date: string;
  round: number;
  gameId: number;
  placement: number;
  team: string;
  player: string;
  character: string;
  kills: number;
  damage: number;
  taken: number;
  killScore: number;
  total: number;
  kpr: number;
};

export type TeamGame = {
  gameId: number;
  event: KelEvent;
  stage: string;
  date: string;
  round: number;
  team: string;
  placement: number;
  killScore: number;
  kills: number;
  total: number;
  damage: number;
  taken: number;
  characters: string[];
};

export type Kel = { rows: KelRow[]; games: TeamGame[] };

const STAGES: Record<string, string> = { group_a: "A조", group_b: "B조", upper_match: "승자조", lower_match: "패자조", lower_finals: "최종전", finals: "결승" };

function stageOf(file: string): { event: KelEvent; stage: string } | null {
  if (/Opening_week_Group_Alpha/i.test(file)) return { event: "opening", stage: "알파 그룹" };
  if (/Opening_week_Group_Omega/i.test(file)) return { event: "opening", stage: "오메가 그룹" };
  if (/MIDSEASON_CUP_SEMIFINALS/i.test(file)) return { event: "msc", stage: "준결승" };
  if (/MIDSEASON_CUP_FINALS/i.test(file)) return { event: "msc", stage: "결승" };
  const m = /CIRCUIT_([1-4])_(Group_A|Group_B|Upper_Match|Lower_Match|Lower_Finals|Finals)_/i.exec(file);
  return m ? { event: `c${m[1]}` as KelEvent, stage: STAGES[m[2].toLowerCase()] } : null;
}

const CHARACTER = new Map(Object.keys(characters).map((k) => [k.toLowerCase(), k]));
const characterKey = (name: string) => {
  const k = name.replace(/[&\s]/g, "");
  return CHARACTER.get(k.toLowerCase()) ?? k;
};

const COLUMNS = {
  date: "날짜",
  round: "라운드",
  gameId: "gameId",
  placement: "순위",
  team: "팀",
  player: "선수",
  character: "실험체",
  kills: "킬",
  damage: "가한피해",
  taken: "받은피해",
  killScore: "killScore",
  total: "TS",
  kpr: "KPR",
} as const;

function parseFile(file: string, text: string): KelRow[] {
  const where = stageOf(file);
  const [head, ...body] = parseCsv(text);
  if (!where || !head) return [];
  const at = Object.fromEntries(Object.entries(COLUMNS).map(([k, name]) => [k, head.indexOf(name)])) as Record<keyof typeof COLUMNS, number>;
  if (Object.values(at).some((i) => i < 0)) {
    console.error(`[kel] ${file}: 필요한 열이 없어 건너뜀`);
    return [];
  }
  const rows: KelRow[] = [];
  for (const r of body) {
    const team = TEAM_BY_CSV.get(r[at.team]?.trim());
    if (!team) continue;
    const num = (k: keyof typeof COLUMNS) => Number(r[at[k]]) || 0;
    const [round, gameId, placement] = [num("round"), num("gameId"), num("placement")];
    if (round < 1 || gameId < 1 || placement < 1 || placement > 8) continue;
    const raw = r[at.player]?.trim() ?? "";
    rows.push({
      ...where,
      date: r[at.date]?.trim() ?? "",
      round,
      gameId,
      placement,
      team: team.key,
      player: raw.includes("_") ? raw.slice(raw.indexOf("_") + 1) : raw,
      character: characterKey(r[at.character] ?? ""),
      kills: num("kills"),
      damage: num("damage"),
      taken: num("taken"),
      killScore: num("killScore"),
      total: num("total"),
      kpr: num("kpr"),
    });
  }
  return rows;
}

function teamGames(rows: KelRow[]): TeamGame[] {
  const map = new Map<string, TeamGame>();
  for (const r of rows) {
    const key = `${r.gameId}:${r.team}`;
    let g = map.get(key);
    if (!g) {
      g = {
        gameId: r.gameId,
        event: r.event,
        stage: r.stage,
        date: r.date,
        round: r.round,
        team: r.team,
        placement: r.placement,
        killScore: r.killScore,
        kills: 0,
        total: r.total,
        damage: 0,
        taken: 0,
        characters: [],
      };
      map.set(key, g);
    }
    g.kills += r.kills;
    g.damage += r.damage;
    g.taken += r.taken;
    g.characters.push(r.character);
  }
  return [...map.values()];
}

const store = globalThis as unknown as { __kel?: { sig: string; data: Kel | null } };
const dir = () => join(process.env.DATA_DIR || join(process.cwd(), "data"), "kel");

// 공개 레포라 CSV는 서버 데이터 폴더에만 둠
export function kelData(): Kel | null {
  try {
    const files = readdirSync(dir())
      .filter((f) => f.endsWith(".csv"))
      .sort();
    const sig = files
      .map((f) => {
        const s = statSync(join(dir(), f));
        return `${f}:${s.size}:${s.mtimeMs}`;
      })
      .join("|");
    if (store.__kel?.sig === sig) return store.__kel.data;
    const rows = files.flatMap((f) => parseFile(f, readFileSync(join(dir(), f), "utf8")));
    const data = rows.length ? { rows, games: teamGames(rows) } : null;
    store.__kel = { sig, data };
    return data;
  } catch (e) {
    // 폴더가 없거나 읽는 중에 파일이 바뀐 경우
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("[kel] 경기 기록을 읽지 못함", e);
    return null;
  }
}

export type KelSummary = { games: number; first: string; last: string };

export function kelSummary(data: Kel): KelSummary {
  const dates = data.rows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  return { games: new Set(data.rows.map((r) => r.gameId)).size, first: dates[0] ?? "", last: dates[dates.length - 1] ?? "" };
}

// bori.wiki 미드 시즌 컵 결과 표 점수와 CSV 점수의 차이
const DEMO_PENALTY: Record<string, number> = { "gj-slasher": 1 };

export type CalcData = { pool: KillPool; maxKillScore: number; teamGames: number; demo: { teams: string[]; rounds: Round[] } | null };

export function kelCalcData(data: Kel): CalcData {
  const pool: KillPool = Array.from({ length: 8 }, () => []);
  let maxKillScore = 0;
  for (const g of data.games) {
    if (g.placement >= 1 && g.placement <= 8) pool[g.placement - 1].push([g.killScore, g.kills]);
    maxKillScore = Math.max(maxKillScore, g.killScore);
  }
  const semi = data.games.filter((g) => g.event === "msc" && g.stage === "준결승");
  const rounds: Round[] = [];
  for (const g of semi) (rounds[g.round - 1] ??= {})[g.team] = { placement: g.placement, kills: g.kills, killScore: g.killScore, penalty: 0 };
  const teams = [...new Set(semi.map((g) => g.team))];
  for (const [team, points] of Object.entries(DEMO_PENALTY)) if (rounds[0]?.[team]) rounds[0][team].penalty += points;
  const complete = teams.length === 8 && rounds.length === 6 && Array.from({ length: 6 }, (_, i) => rounds[i]).every((r) => r && Object.keys(r).length === 8);
  return { pool, maxKillScore, teamGames: data.games.length, demo: complete ? { teams, rounds } : null };
}
