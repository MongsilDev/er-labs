// 삭제 요청을 받은 계정의 기록을 지우고 이후 표시하지 않음
// 사용: docker exec tarkov-labs node scripts/hide.mjs <계정 번호>
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const aid = Number(process.argv[2]);
if (!Number.isSafeInteger(aid) || aid <= 0) throw new Error("계정 번호를 지정해주세요");
const conn = new DatabaseSync(join(process.env.DATA_DIR || "data", "tarkov-labs.db"));
conn.exec("PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
conn.prepare("INSERT OR IGNORE INTO hidden (aid, at) VALUES (?, ?)").run(aid, Date.now());
for (const t of ["names", "snapshots", "baseline"]) console.log(t, conn.prepare(`DELETE FROM ${t} WHERE aid = ?`).run(aid).changes);
conn.exec("COMMIT");
