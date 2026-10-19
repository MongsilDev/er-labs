import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS accounts (
  aid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_lc TEXT NOT NULL,
  u_pvp INTEGER,
  u_season INTEGER,
  u_pve INTEGER,
  u_arena INTEGER
);
CREATE INDEX IF NOT EXISTS accounts_name ON accounts(name_lc);
CREATE INDEX IF NOT EXISTS accounts_u_pvp ON accounts(u_pvp) WHERE u_pvp IS NOT NULL;
CREATE INDEX IF NOT EXISTS accounts_u_season ON accounts(u_season) WHERE u_season IS NOT NULL;
CREATE INDEX IF NOT EXISTS accounts_u_pve ON accounts(u_pve) WHERE u_pve IS NOT NULL;
CREATE INDEX IF NOT EXISTS accounts_u_arena ON accounts(u_arena) WHERE u_arena IS NOT NULL;
CREATE TABLE IF NOT EXISTS names (
  id INTEGER PRIMARY KEY,
  aid INTEGER NOT NULL,
  old_name TEXT NOT NULL,
  new_name TEXT NOT NULL,
  seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS names_aid ON names(aid, seen_at);
CREATE TABLE IF NOT EXISTS snapshots (
  aid INTEGER NOT NULL,
  mode TEXT NOT NULL,
  updated INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (aid, mode, updated)
);
CREATE TABLE IF NOT EXISTS baseline (
  mode TEXT NOT NULL,
  aid INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  hours REAL NOT NULL,
  n INTEGER NOT NULL,
  kills INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  survived INTEGER NOT NULL,
  streak INTEGER NOT NULL,
  headshots INTEGER NOT NULL,
  max_game_kills INTEGER NOT NULL,
  PRIMARY KEY (mode, aid)
);
CREATE INDEX IF NOT EXISTS baseline_peer ON baseline(mode, hours, n);
CREATE TABLE IF NOT EXISTS hidden (
  aid INTEGER PRIMARY KEY,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const g = globalThis as unknown as { __tlDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__tlDb) {
    const dir = process.env.DATA_DIR || join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const conn = new DatabaseSync(join(dir, "tarkov-labs.db"));
    conn.exec(SCHEMA);
    g.__tlDb = conn;
  }
  return g.__tlDb;
}

export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    conn.exec("COMMIT");
    return out;
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

export function getMeta(key: string): string | null {
  const row = db().prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  db().prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export const isHidden = (aid: number) => Boolean(db().prepare("SELECT 1 FROM hidden WHERE aid = ?").get(aid));
