import "server-only";
import { captureException } from "@sentry/node";
import { combine, judge, MIN_N, TARGET_PEERS, WIDTHS, type Sample, type Verdict } from "@/tarkov/lib/criteria";
import { MODES, type Mode } from "@/tarkov/lib/modes";
import { modeSample, toSample } from "@/tarkov/lib/sample";
import { parse, type Summary } from "@/tarkov/lib/summary";
import { db } from "./db";
import { fetchProfile, Upstream } from "./upstream";

// 최근 30일 안에 갱신된 계정을 천천히 받아 비교군을 만듦. 숫자만 저장
// 아레나는 계정 합계 행과 함께 mode 열이 arena/<모드 키>인 모드별 행을 둠. 모드별 행의 hours는 0
export const WINDOW = 30 * 24 * 60 * 60 * 1000;
const PEER_LIMIT = 2000;
const ARENA_PREFIX = "arena/";

function save(key: string, aid: number, updated: number, s: Sample) {
  db()
    .prepare(
      `INSERT INTO baseline (mode, aid, updated, hours, n, kills, deaths, survived, streak, headshots, max_game_kills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(mode, aid) DO UPDATE SET updated = excluded.updated, hours = excluded.hours, n = excluded.n, kills = excluded.kills,
         deaths = excluded.deaths, survived = excluded.survived, streak = excluded.streak, headshots = excluded.headshots, max_game_kills = excluded.max_game_kills`,
    )
    .run(key, aid, updated, s.hours, s.n, s.kills, s.deaths, s.survived, s.streak, s.headshots, s.maxGameKills);
}

function candidates(mode: Mode, limit: number): { aid: number; u: number }[] {
  const col = `u_${mode.key}`;
  // 모드별 행이 없던 때 받은 아레나 계정도 다시 받음
  const backfill =
    mode.key === "arena" ? ` OR (b.n > 0 AND NOT EXISTS (SELECT 1 FROM baseline m WHERE m.aid = a.aid AND m.mode LIKE '${ARENA_PREFIX}%'))` : "";
  return db()
    .prepare(
      `SELECT a.aid AS aid, a.${col} AS u FROM accounts a
       LEFT JOIN baseline b ON b.mode = ? AND b.aid = a.aid
       WHERE a.${col} >= ? AND (b.updated IS NULL OR b.updated < a.${col}${backfill}) AND a.aid NOT IN (SELECT aid FROM hidden)
       ORDER BY a.${col} DESC LIMIT ?`,
    )
    .all(mode.key, Date.now() - WINDOW, limit) as { aid: number; u: number }[];
}

const g = globalThis as unknown as { __tlCrawling?: boolean };

export async function crawl(): Promise<number> {
  if (g.__tlCrawling) return 0;
  g.__tlCrawling = true;
  let done = 0;
  let fails = 0;
  try {
    // 모드마다 조금씩 돌아가며 받아 한 모드가 오래 밀리지 않게 함
    for (;;) {
      let any = false;
      for (const mode of MODES) {
        const batch = candidates(mode, 50);
        if (!batch.length) continue;
        any = true;
        for (const c of batch) {
          try {
            const raw = await fetchProfile(mode.folder, c.aid, "crawl");
            const sum = raw ? parse(mode.folder, raw) : null;
            const s = sum ? toSample(sum) : null;
            // 받지 못한 계정도 같은 갱신 시각으로 표시해 다시 고르지 않음
            save(mode.key, c.aid, c.u, s ?? { hours: 0, n: 0, kills: 0, deaths: 0, survived: 0, streak: 0, headshots: 0, maxGameKills: 0 });
            if (sum?.kind === "arena") {
              for (const m of sum.modes) save(ARENA_PREFIX + m.key, c.aid, c.u, modeSample(m.stats));
              // 모드 기록이 없는 계정도 표시 행을 남겨 모드별 재수집 대상에서 뺌
              if (!sum.modes.length) save(ARENA_PREFIX + "-", c.aid, c.u, { hours: 0, n: 0, kills: 0, deaths: 0, survived: 0, streak: 0, headshots: 0, maxGameKills: 0 });
            }
            done++;
          } catch (e) {
            fails++;
            if (e instanceof Upstream && (e.status === 429 || e.status >= 500)) await new Promise((r) => setTimeout(r, 60_000));
            if (fails >= 20) throw e;
          }
        }
      }
      if (!any) break;
    }
    if (done) console.log(`[비교군] ${done}건 수집`);
  } catch (e) {
    console.error("[비교군] 중단", e);
    captureException(e);
  } finally {
    g.__tlCrawling = false;
  }
  return done;
}

export function peers(key: string, aid: number, s: Sample): { rows: Sample[]; width: number } {
  const q = db().prepare(
    `SELECT hours, n, kills, deaths, survived, streak, headshots, max_game_kills AS maxGameKills FROM baseline
     WHERE mode = ? AND aid != ? AND n > 0 AND hours BETWEEN ? AND ? AND n BETWEEN ? AND ? LIMIT ?`,
  );
  let last: Sample[] = [];
  for (const w of WIDTHS) {
    last = q.all(key, aid, s.hours * (1 - w), s.hours * (1 + w), Math.floor(s.n * (1 - w)), Math.ceil(s.n * (1 + w)), PEER_LIMIT) as Sample[];
    if (last.length >= TARGET_PEERS) return { rows: last, width: w };
  }
  return { rows: last, width: WIDTHS[WIDTHS.length - 1] };
}

export function verdict(mode: Mode, aid: number, sum: Summary | null): Verdict {
  if (sum?.kind === "arena") {
    // 모드마다 킬이 나오는 정도가 달라 같은 모드를 비슷한 경기 수만큼 한 계정끼리 비교
    const parts = sum.modes
      .filter((m) => m.stats.games >= MIN_N)
      .map((m) => {
        const s = modeSample(m.stats);
        const { rows, width } = peers(ARENA_PREFIX + m.key, aid, s);
        return { key: m.key, games: m.stats.games, v: judge("arena", s, rows, width) };
      });
    return combine(parts);
  }
  const s = sum ? toSample(sum) : null;
  if (!s) return { state: "none", reason: "missing" };
  const { rows, width } = peers(mode.key, aid, s);
  return judge("eft", s, rows, width);
}

export function baselineCounts(): Record<string, number> {
  const rows = db().prepare(`SELECT mode, COUNT(*) AS c FROM baseline WHERE n > 0 AND mode NOT LIKE '${ARENA_PREFIX}%' GROUP BY mode`).all() as { mode: string; c: number }[];
  return Object.fromEntries(rows.map((r) => [r.mode, r.c]));
}
