// 삭제 요청을 받은 계정을 숨김 목록에 넣음. 그 계정의 기록은 스키마의 트리거가 지우고 이후에도 남기지 않음
// 사용: docker exec labs node scripts/tarkov/hide.mjs <계정 번호>
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const aid = Number(process.argv[2]);
if (!Number.isSafeInteger(aid) || aid <= 0) throw new Error("계정 번호를 지정해주세요");
const conn = new DatabaseSync(join(process.env.DATA_DIR || "data", "tarkov-labs.db"));
conn.exec("PRAGMA busy_timeout = 5000");
if (!conn.prepare("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = 'hidden_purge'").get()) throw new Error("숨김 트리거가 없습니다. 서버를 새 버전으로 한 번 띄운 뒤 다시 실행해주세요");
const total = () => conn.prepare("SELECT total_changes() AS n").get().n;
const before = total();
const added = conn.prepare("INSERT OR IGNORE INTO hidden (aid, at) VALUES (?, ?)").run(aid, Date.now()).changes;
console.log("hidden", added, "deleted", total() - before - added);
