import "server-only";
import { captureException } from "@sentry/node";
import { judge, WIDTHS, type Sample, type Verdict } from "@/lib/criteria";
import { MODES, type Mode } from "@/lib/modes";
import { toSample } from "@/lib/sample";
import { parse } from "@/lib/summary";
import { db } from "./db";
import { fetchProfile, Upstream } from "./upstream";

// 최근 30일 안에 갱신된 계정을 천천히 받아 비교군을 만듦. 숫자만 저장
export const WINDOW = 30 * 24 * 60 * 60 * 1000;
const PEER_LIMIT = 2000;

const kindOf = (m: Mode) => (m.key === "arena" ? "arena" : "eft");

function save(mode: Mode, aid: number, updated: number, s: Sample) {
  db()
    .prepare(
      `INSERT INTO baseline (mode, aid, updated, hours, n, kills, deaths, survived, streak, headshots, max_game_kills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(mode, aid) DO UPDATE SET updated = excluded.updated, hours = excluded.hours, n = excluded.n, kills = excluded.kills,
         deaths = excluded.deaths, survived = excluded.survived, streak = excluded.streak, headshots = excluded.headshots, max_game_kills = excluded.max_game_kills`,
    )
    .run(mode.key, aid, updated, s.hours, s.n, s.kills, s.deaths, s.survived, s.streak, s.headshots, s.maxGameKills);
}

function candidates(mode: Mode, limit: number): { aid: number; u: number }[] {
  const col = `u_${mode.key}`;
  return db()
    .prepare(
      `SELECT a.aid AS aid, a.${col} AS u FROM accounts a
       LEFT JOIN baseline b ON b.mode = ? AND b.aid = a.aid
       WHERE a.${col} >= ? AND (b.updated IS NULL OR b.updated < a.${col}) AND a.aid NOT IN (SELECT aid FROM hidden)
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
            const s = raw ? toSample(parse(mode.folder, raw)) : null;
            // 받지 못한 계정도 같은 갱신 시각으로 표시해 다시 고르지 않음
            save(mode, c.aid, c.u, s ?? { hours: 0, n: 0, kills: 0, deaths: 0, survived: 0, streak: 0, headshots: 0, maxGameKills: 0 });
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

export function peers(mode: Mode, aid: number, s: Sample): { rows: Sample[]; width: number } {
  const q = db().prepare(
    `SELECT hours, n, kills, deaths, survived, streak, headshots, max_game_kills AS maxGameKills FROM baseline
     WHERE mode = ? AND aid != ? AND n > 0 AND hours BETWEEN ? AND ? AND n BETWEEN ? AND ? LIMIT ?`,
  );
  let last: Sample[] = [];
  for (const w of WIDTHS) {
    last = q.all(mode.key, aid, s.hours * (1 - w), s.hours * (1 + w), Math.floor(s.n * (1 - w)), Math.ceil(s.n * (1 + w)), PEER_LIMIT) as Sample[];
    if (last.length >= 30) return { rows: last, width: w };
  }
  return { rows: last, width: WIDTHS[WIDTHS.length - 1] };
}

export function verdict(mode: Mode, aid: number, s: Sample | null): Verdict {
  if (!s) return { state: "none", reason: "missing" };
  const { rows, width } = peers(mode, aid, s);
  return judge(kindOf(mode), s, rows, width);
}

export function baselineCounts(): Record<string, number> {
  const rows = db().prepare("SELECT mode, COUNT(*) AS c FROM baseline WHERE n > 0 GROUP BY mode").all() as { mode: string; c: number }[];
  return Object.fromEntries(rows.map((r) => [r.mode, r.c]));
}
