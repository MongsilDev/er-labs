import "server-only";
import { captureException } from "@sentry/node";
import { date } from "@/tarkov/lib/format";
import type { Mode, ModeKey } from "@/tarkov/lib/modes";
import { parse, type Summary } from "@/tarkov/lib/summary";
import { db, isHidden } from "./db";
import { allow } from "@/limits";
import { fetchProfile, Upstream } from "./upstream";

const TTL = 10 * 60 * 1000;

type Entry = { summary: Summary | null; at: number };
const g = globalThis as unknown as { __tlCache?: Map<string, Entry>; __tlInflight?: Map<string, Promise<Loaded>> };
const cache = (g.__tlCache ??= new Map());
const inflight = (g.__tlInflight ??= new Map());

export type Loaded = { summary: Summary | null; stale: boolean; error: boolean };

function remember(mode: Mode, s: Summary) {
  if (isHidden(s.aid)) return;
  const conn = db();
  conn
    .prepare("INSERT OR IGNORE INTO snapshots (aid, mode, updated, fetched_at, data) VALUES (?, ?, ?, ?, ?)")
    .run(s.aid, mode.key, s.updated, Date.now(), JSON.stringify(s));
  if (!s.name) return;
  const row = conn.prepare("SELECT name FROM accounts WHERE aid = ?").get(s.aid) as { name: string } | undefined;
  if (!row) conn.prepare("INSERT INTO accounts (aid, name, name_lc) VALUES (?, ?, ?)").run(s.aid, s.name, s.name.toLowerCase());
  else if (row.name !== s.name) {
    // 다른 모드까지 포함해 가장 최근 기록보다 오래된 프로필이면 이름을 되돌리지 않음
    const newer =
      (
        conn
          .prepare("SELECT MAX(COALESCE(u_pvp, 0), COALESCE(u_season, 0), COALESCE(u_pve, 0), COALESCE(u_arena, 0)) AS u FROM accounts WHERE aid = ?")
          .get(s.aid) as { u: number }
      ).u;
    if (s.updated >= newer) {
      conn.prepare("UPDATE accounts SET name = ?, name_lc = ? WHERE aid = ?").run(s.name, s.name.toLowerCase(), s.aid);
      conn.prepare("INSERT INTO names (aid, old_name, new_name, seen_at) VALUES (?, ?, ?, ?)").run(s.aid, row.name, s.name, s.updated);
    }
  }
}

function lastSnapshot(aid: number, mode: ModeKey): Summary | null {
  const row = db().prepare("SELECT data FROM snapshots WHERE aid = ? AND mode = ? ORDER BY updated DESC LIMIT 1").get(aid, mode) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Summary) : null;
}

// 같은 계정의 동시 조회는 업스트림 호출 하나를 나눠 쓰되 다시 불러오기는 새로 요청하고, ip를 넘긴 조회는 업스트림 호출을 IP마다 분당 30번까지 함
export async function load(mode: Mode, aid: number, fresh = false, ip?: string): Promise<Loaded> {
  if (isHidden(aid)) return { summary: null, stale: false, error: false };
  const key = `${mode.key}:${aid}`;
  const hit = cache.get(key);
  if (hit && !fresh && Date.now() - hit.at < TTL) return { summary: hit.summary, stale: false, error: false };
  const running = inflight.get(key);
  if (running && !fresh) return running;
  if (ip && !allow(`u:${ip}`, 30, 60_000)) return { summary: lastSnapshot(aid, mode.key), stale: true, error: true };
  const p: Promise<Loaded> = fetchAndStore(mode, aid, key).finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

async function fetchAndStore(mode: Mode, aid: number, key: string): Promise<Loaded> {
  try {
    const raw = await fetchProfile(mode.folder, aid);
    const summary = raw ? parse(mode.folder, raw) : null;
    if (summary) {
      summary.aid = aid;
      remember(mode, summary);
    }
    cache.set(key, { summary, at: Date.now() });
    if (cache.size > 5000) for (const [k, v] of cache) if (Date.now() - v.at > TTL) cache.delete(k);
    return { summary, stale: false, error: false };
  } catch (e) {
    if (!(e instanceof Upstream)) captureException(e);
    console.error(`[프로필] ${key} 실패`, e);
    return { summary: lastSnapshot(aid, mode.key), stale: true, error: true };
  }
}

export type Account = { aid: number; name: string; modes: Record<ModeKey, number | null> };

export function account(aid: number): Account | null {
  const row = db().prepare("SELECT aid, name, u_pvp, u_season, u_pve, u_arena FROM accounts WHERE aid = ?").get(aid) as
    | { aid: number; name: string; u_pvp: number | null; u_season: number | null; u_pve: number | null; u_arena: number | null }
    | undefined;
  if (!row) return null;
  return { aid: row.aid, name: row.name, modes: { pvp: row.u_pvp, season: row.u_season, pve: row.u_pve, arena: row.u_arena } };
}

// 이 모드 기록이 다른 모드보다 오래됐으면 색인의 최신 이름을 씀
export function displayName(aid: number, acc: Account | null, s: Summary | null): string {
  const latest = acc ? Math.max(...Object.values(acc.modes).map((u) => u ?? 0)) : 0;
  return (s && s.updated >= latest ? s.name : acc?.name) || s?.name || `#${aid}`;
}

// 같은 날 같은 변경이 여러 번 기록된 행은 하나로 셈
export function nameHistory(aid: number): { old: string; next: string; at: number }[] {
  const rows = db().prepare("SELECT old_name AS old, new_name AS next, seen_at AS at FROM names WHERE aid = ? ORDER BY seen_at DESC LIMIT 50").all(aid) as {
    old: string;
    next: string;
    at: number;
  }[];
  const seen = new Set<string>();
  const list = rows.filter((r) => {
    const k = `${r.old}\n${r.next}\n${date(r.at)}`;
    return !seen.has(k) && !!seen.add(k);
  });
  // 모드별 색인 이름이 엇갈려 같은 날 A에서 B로, 다시 A로 기록된 쌍은 둘 다 뺌
  const drop = new Set<number>();
  list.forEach((r, i) => {
    if (drop.has(i)) return;
    const j = list.findIndex((o, k) => k > i && !drop.has(k) && o.old === r.next && o.next === r.old && date(o.at) === date(r.at));
    if (j > 0) drop.add(i).add(j);
  });
  return list.filter((_, i) => !drop.has(i));
}

export function snapshots(aid: number, mode: ModeKey): Summary[] {
  const rows = db().prepare("SELECT data FROM snapshots WHERE aid = ? AND mode = ? ORDER BY updated DESC LIMIT 20").all(aid, mode) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Summary);
}

export function search(q: string, limit = 10): { aid: number; name: string; last: number | null }[] {
  const t = q.trim();
  const a = /^\d{1,10}$/.test(t) ? account(Number(t)) : null;
  const byName = t.length >= 2 ? prefix(t.toLowerCase(), limit) : [];
  return a ? [{ aid: a.aid, name: a.name, last: latest(a) }, ...byName.filter((r) => r.aid !== a.aid)].slice(0, limit) : byName;
}

const latest = (a: Account) => Math.max(0, ...Object.values(a.modes).map((v) => v ?? 0)) || null;

// 짧은 접두어는 수만 행이 걸려 정렬 비용이 커지므로 이름순 앞 500개 안에서만 최근 순으로 고름
function prefix(lc: string, limit: number) {
  const rows = db()
    .prepare(
      `SELECT aid, name, last FROM (
         SELECT aid, name, name_lc, MAX(COALESCE(u_pvp, 0), COALESCE(u_season, 0), COALESCE(u_pve, 0), COALESCE(u_arena, 0)) AS last
         FROM accounts WHERE name_lc >= ? AND name_lc < ? AND aid NOT IN (SELECT aid FROM hidden) ORDER BY name_lc LIMIT 500)
       ORDER BY name_lc = ? DESC, last DESC, name_lc LIMIT ?`,
    )
    .all(lc, lc + "￿", lc, limit) as { aid: number; name: string; last: number }[];
  return rows.map((r) => ({ ...r, last: r.last || null }));
}

export const nameChangeCount = () => (db().prepare("SELECT COUNT(*) AS n FROM names").get() as { n: number }).n;
