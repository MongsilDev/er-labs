import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  rules TEXT NOT NULL,
  planned_rounds INTEGER NOT NULL,
  group_count INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS members (
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, user_id)
);
CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_idx INTEGER NOT NULL,
  round_no INTEGER NOT NULL,
  source TEXT NOT NULL,
  game_id INTEGER,
  file_name TEXT,
  players TEXT NOT NULL,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rounds_slot ON rounds(tournament_id, group_idx, round_no) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rounds_game ON rounds(tournament_id, game_id) WHERE deleted_at IS NULL AND game_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS weather (
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_idx INTEGER NOT NULL,
  round_no INTEGER NOT NULL,
  main TEXT,
  sub TEXT,
  PRIMARY KEY (tournament_id, group_idx, round_no)
);
CREATE TABLE IF NOT EXISTS penalties (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_idx INTEGER NOT NULL,
  team TEXT NOT NULL,
  round_no INTEGER NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL,
  points REAL NOT NULL,
  reason TEXT NOT NULL,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS aliases (
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_idx INTEGER NOT NULL,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  PRIMARY KEY (tournament_id, group_idx, from_name)
);
CREATE TABLE IF NOT EXISTS overrides (
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_idx INTEGER NOT NULL,
  round_no INTEGER NOT NULL,
  team TEXT NOT NULL,
  state INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, group_idx, round_no, team)
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_t ON logs(tournament_id, id);
CREATE INDEX IF NOT EXISTS members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`;

const g = globalThis as unknown as { __erDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__erDb) {
    const dir = process.env.DATA_DIR || join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const conn = new DatabaseSync(join(dir, "er-labs.db"));
    conn.exec(SCHEMA);
    g.__erDb = conn;
  }
  return g.__erDb;
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

export const now = () => Date.now();
export const DAY = 24 * 60 * 60 * 1000;
