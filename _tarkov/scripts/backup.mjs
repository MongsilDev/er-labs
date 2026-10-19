// 다시 만들 수 없는 표만 작은 파일로 복사. 이름 색인과 비교군은 다시 받으면 됨
// 사용: docker exec tarkov-labs node scripts/backup.mjs
import { rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dir = process.env.DATA_DIR || "data";
const out = join(dir, ".backup-tarkov-labs.db");
rmSync(out, { force: true });
const conn = new DatabaseSync(join(dir, "tarkov-labs.db"));
conn.exec("PRAGMA busy_timeout = 5000");
conn.prepare("ATTACH ? AS b").run(out);
conn.exec("BEGIN; CREATE TABLE b.names AS SELECT * FROM names; CREATE TABLE b.snapshots AS SELECT * FROM snapshots; CREATE TABLE b.hidden AS SELECT * FROM hidden; COMMIT");
conn.exec("DETACH b");
