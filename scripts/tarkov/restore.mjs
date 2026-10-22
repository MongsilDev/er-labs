// backup.mjs 사본의 이름 기록과 전적 기록을 지금 DB에 합침. 숨김 목록은 지금 DB와 사본을 합치고, 숨긴 계정의 행은 스키마의 트리거가 걸러 냄
// 사용: docker exec labs node scripts/tarkov/restore.mjs <사본 경로>
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const src = process.argv[2];
if (!src || !existsSync(src)) throw new Error("백업 사본 경로를 지정해주세요");
const conn = new DatabaseSync(join(process.env.DATA_DIR || "data", "tarkov-labs.db"));
conn.exec("PRAGMA busy_timeout = 5000");
if (!conn.prepare("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = 'hidden_purge'").get()) throw new Error("숨김 트리거가 없습니다. 서버를 새 버전으로 한 번 띄운 뒤 다시 실행해주세요");
conn.prepare("ATTACH ? AS b").run(src);
conn.exec("BEGIN IMMEDIATE; INSERT OR IGNORE INTO main.hidden (aid, at) SELECT aid, at FROM b.hidden");
const snaps = conn.prepare("INSERT OR IGNORE INTO main.snapshots (aid, mode, updated, fetched_at, data) SELECT aid, mode, updated, fetched_at, data FROM b.snapshots").run().changes;
const names = conn
  .prepare(
    `INSERT INTO main.names (aid, old_name, new_name, seen_at) SELECT aid, old_name, new_name, seen_at FROM b.names n
     WHERE NOT EXISTS (SELECT 1 FROM main.names m WHERE m.aid = n.aid AND m.seen_at = n.seen_at AND m.old_name = n.old_name AND m.new_name = n.new_name)`,
  )
  .run().changes;
conn.exec("COMMIT; DETACH b");
console.log("snapshots", snaps, "names", names);
