import "server-only";
import { captureException } from "@sentry/node";
import type { Mode, ModeKey } from "@/lib/modes";
import { parse, type Summary } from "@/lib/summary";
import { db, isHidden } from "./db";
import { fetchProfile, Upstream } from "./upstream";

const TTL = 10 * 60 * 1000;

type Entry = { summary: Summary | null; at: number };
const g = globalThis as unknown as { __tlCache?: Map<string, Entry> };
const cache = (g.__tlCache ??= new Map());

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
    // 색인보다 오래된 프로필이면 이름을 되돌리지 않음
    const newer = (conn.prepare(`SELECT u_${mode.key} AS u FROM accounts WHERE aid = ?`).get(s.aid) as { u: number | null }).u ?? 0;
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

export async function load(mode: Mode, aid: number, fresh = false): Promise<Loaded> {
  const key = `${mode.key}:${aid}`;
  const hit = cache.get(key);
  if (hit && !fresh && Date.now() - hit.at < TTL) return { summary: hit.summary, stale: false, error: false };
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

export function nameHistory(aid: number): { old: string; next: string; at: number }[] {
  return db().prepare("SELECT old_name AS old, new_name AS next, seen_at AS at FROM names WHERE aid = ? ORDER BY seen_at DESC LIMIT 50").all(aid) as {
    old: string;
    next: string;
    at: number;
  }[];
}

export function snapshots(aid: number, mode: ModeKey): Summary[] {
  const rows = db().prepare("SELECT data FROM snapshots WHERE aid = ? AND mode = ? ORDER BY updated DESC LIMIT 20").all(aid, mode) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Summary);
}

export function search(q: string, limit = 10): { aid: number; name: string; last: number | null }[] {
  const t = q.trim();
  if (/^\d{1,10}$/.test(t)) {
    const a = isHidden(Number(t)) ? null : account(Number(t));
    const byName = prefix(t.toLowerCase(), limit);
    return a ? [{ aid: a.aid, name: a.name, last: latest(a) }, ...byName.filter((r) => r.aid !== a.aid)].slice(0, limit) : byName;
  }
  if (t.length < 2) return [];
  return prefix(t.toLowerCase(), limit);
}

const latest = (a: Account) => Math.max(0, ...Object.values(a.modes).map((v) => v ?? 0)) || null;

function prefix(lc: string, limit: number) {
  const rows = db()
    .prepare(
      `SELECT aid, name, MAX(COALESCE(u_pvp, 0), COALESCE(u_season, 0), COALESCE(u_pve, 0), COALESCE(u_arena, 0)) AS last
       FROM accounts WHERE name_lc >= ? AND name_lc < ? AND aid NOT IN (SELECT aid FROM hidden) ORDER BY name_lc = ? DESC, last DESC, name_lc LIMIT ?`,
    )
    .all(lc, lc + "￿", lc, limit) as { aid: number; name: string; last: number }[];
  return rows.map((r) => ({ ...r, last: r.last || null }));
}
