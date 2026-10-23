import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Op } from "../../src/er/lib/view";
import { csv } from "./helpers";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "er-labs-test-"));
afterAll(() => rmSync(process.env.DATA_DIR!, { recursive: true, force: true }));

const owner = { id: "1", name: "개최자", avatar: null };
const op = { id: "2", name: "운영자", avatar: null };
const stranger = { id: "3", name: "남", avatar: null };

type T = typeof import("../../src/er/server/tournament");
let t: T;
let db: typeof import("../../src/er/server/db");

beforeAll(async () => {
  db = await import("../../src/er/server/db");
  t = await import("../../src/er/server/tournament");
  for (const u of [owner, op, stranger]) {
    db.db().prepare("INSERT INTO users(id, name, avatar, updated_at) VALUES (?, ?, NULL, ?)").run(u.id, u.name, Date.now());
  }
});

const teams = (order: string[]) => order.map((team, i) => ({ team, place: i + 1, ks: 1 }));

describe("대회 서버", () => {
  it("CSV를 빈 라운드에 순서대로 넣고 같은 경기는 거부한다", () => {
    const code = t.createTournament(owner, { name: "시험", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 2 });
    const a = csv(200, teams(["가", "나"]));
    const b = csv(100, teams(["나", "가"]));
    const r = t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "a.csv", text: a }, { name: "b.csv", text: b }] });
    expect(r.notices).toEqual(["A조 1라운드에 2팀 기록을 추가했습니다.", "A조 2라운드에 2팀 기록을 추가했습니다."]);
    const view = t.loadView(code, null)!;
    expect(view.groups[0].rounds.map((x) => x.gameId)).toEqual([100, 200]);
    const dup = t.applyOp(code, owner, { op: "add_csv", group: 1, files: [{ name: "again.csv", text: a }] });
    expect(dup.errors).toEqual(["again.csv: 이미 A조 2라운드에 올린 경기입니다."]);
  });

  it("교체한 라운드를 되돌리면 이전 기록이 돌아온다", () => {
    const code = t.createTournament(owner, { name: "교체", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "old.csv", text: csv(1, teams(["가"])) }] });
    const r = t.applyOp(code, owner, { op: "add_csv", group: 0, round: 1, files: [{ name: "new.csv", text: csv(2, teams(["가"])) }] });
    expect(t.loadView(code, null)!.groups[0].rounds[0].gameId).toBe(2);
    expect(r.undo?.op).toMatchObject({ op: "restore_round", replace: true });
    t.applyOp(code, owner, r.undo!.op);
    const rounds = t.loadView(code, null)!.groups[0].rounds;
    expect(rounds.map((x) => [x.roundNo, x.gameId])).toEqual([[1, 1]]);
  });

  it("권한이 없는 사람은 바꿀 수 없고, 초대 링크는 한 번만 쓴다", () => {
    const code = t.createTournament(owner, { name: "권한", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    expect(() => t.applyOp(code, stranger, { op: "set_weather", group: 0, round: 1, sub: "무풍" })).toThrow("없는 대회이거나 이 대회의 운영자가 아닙니다.");
    const token = t.createInvite(code, owner);
    expect(t.acceptInvite(token, op)).toEqual({ code, already: false });
    expect(() => t.acceptInvite(token, stranger)).toThrow("인원이 다 찼거나 취소된 초대 링크입니다.");
    expect(() => t.applyOp(code, op, { op: "update_settings", name: "바꿈" })).toThrow("대회 설정은 개최자만 바꿀 수 있습니다.");
    expect(() => t.createInvite(code, op)).toThrow("개최자만 할 수 있습니다.");
    t.transferOwner(code, owner, op.id);
    expect(t.loadView(code, op)!.role).toBe("owner");
    expect(t.loadView(code, owner)!.role).toBe("operator");
    t.removeMember(code, op, owner.id);
    expect(t.loadView(code, owner)!.role).toBeNull();
  });

  it("인원을 정한 초대 링크는 그 인원만큼 쓰고 운영자 자리를 넘지 않는다", () => {
    const code = t.createTournament(owner, { name: "여럿", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const token = t.createInvite(code, owner, 2);
    expect(t.members(code, owner).invites[0].usesLeft).toBe(2);
    expect(t.acceptInvite(token, op)).toEqual({ code, already: false });
    expect(t.acceptInvite(token, op)).toEqual({ code, already: true });
    expect(t.inviteInfo(token)?.usesLeft).toBe(1);
    expect(t.acceptInvite(token, stranger)).toEqual({ code, already: false });
    expect(t.inviteInfo(token)).toBeNull();
    expect(() => t.createInvite(code, owner, 9)).toThrow("지금은 8명까지 더 초대할 수 있습니다.");
    t.createInvite(code, owner, 8);
    expect(() => t.createInvite(code, owner, 1)).toThrow("운영자는 개최자 외 최대 10명입니다.");
  });

  it("조와 라운드 수는 기록이 있는 범위 아래로 줄일 수 없다", () => {
    const code = t.createTournament(owner, { name: "설정", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 2 });
    t.applyOp(code, owner, { op: "add_csv", group: 1, files: [{ name: "x.csv", text: csv(55, teams(["가"])) }] });
    expect(() => t.applyOp(code, owner, { op: "update_settings", groupCount: 1 })).toThrow("B조에 기록이 있어 조 수를 줄일 수 없습니다.");
    t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "y.csv", text: csv(56, teams(["가"])) }, { name: "z.csv", text: csv(57, teams(["가"])) }] });
    expect(() => t.applyOp(code, owner, { op: "update_settings", plannedRounds: 1 })).toThrow("2라운드까지 기록이 있어");
  });

  it("직접 입력은 잘못된 순위와 중복 순위를 거부한다", () => {
    const code = t.createTournament(owner, { name: "직접", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const bad = (teams: unknown[]) => () => t.applyOp(code, owner, { op: "add_manual", group: 0, round: 1, teams: teams as never });
    expect(bad([{ team: "A", placement: 0, killScore: 0 }])).toThrow("순위는 1부터 8까지의 정수로");
    expect(bad([{ team: "A", placement: "3", killScore: 0 }])).toThrow("순위는 1부터 8까지의 정수로");
    expect(bad([{ team: "A", placement: 9, killScore: 0 }])).toThrow("순위는 1부터 8까지의 정수로");
    expect(bad([{ team: "A", placement: 1, killScore: 0 }, { team: "B", placement: 1, killScore: 0 }])).toThrow("두 팀에 같은 순위를");
    expect(bad([{ team: "A", placement: 1, killScore: 1e9 }])).toThrow("킬 점수는 0부터 300까지");
    t.applyOp(code, owner, { op: "add_manual", group: 0, round: 1, teams: [{ team: "A", placement: 1, killScore: 2 }] });
    expect(t.loadView(code, null)!.groups[0].rounds[0].players[0]).toMatchObject({ team: "A", placement: 1, killScore: 2 });
  });

  it("되살리기는 지금 설정 범위를 벗어난 라운드를 거부한다", () => {
    const code = t.createTournament(owner, { name: "범위", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const files = [1, 2, 3, 4].map((i) => ({ name: `${i}.csv`, text: csv(900 + i, teams(["가"])) }));
    t.applyOp(code, owner, { op: "add_csv", group: 0, files });
    const r4 = t.loadView(code, null)!.groups[0].rounds.find((r) => r.roundNo === 4)!;
    t.applyOp(code, owner, { op: "delete_round", id: r4.id });
    t.applyOp(code, owner, { op: "update_settings", plannedRounds: 3 });
    expect(() => t.applyOp(code, owner, { op: "restore_round", id: r4.id })).toThrow("벗어난 기록이라 되살릴 수 없습니다");
  });

  it("두 팀 이름이 서로를 가리키는 설정은 거부한다", () => {
    const code = t.createTournament(owner, { name: "별칭", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    t.applyOp(code, owner, { op: "rename_team", group: 0, from: "A", to: "B" });
    expect(() => t.applyOp(code, owner, { op: "rename_team", group: 0, from: "B", to: "A" })).toThrow("서로를 가리키게");
  });

  it("이름 변경은 팀에 속한 기록 기준 이름 전부에 걸고, 되돌리기도 각각 된다", () => {
    const code = t.createTournament(owner, { name: "여러 기록", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    t.applyOp(code, owner, { op: "rename_team", group: 0, from: "1R Team 3", to: "우리팀", also: ["1R Team 3", "2R Team 5", "우리팀"] });
    expect(t.loadView(code, null)!.groups[0].aliases).toEqual({ "1R Team 3": "우리팀", "2R Team 5": "우리팀" });
    t.applyOp(code, owner, { op: "rename_team", group: 0, from: "2R Team 5", to: "" });
    expect(t.loadView(code, null)!.groups[0].aliases).toEqual({ "1R Team 3": "우리팀" });
  });

  it("CSV 팀 이름은 40자로 정리돼 감점이 같은 팀에 붙는다", () => {
    const code = t.createTournament(owner, { name: "긴 이름", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const long = "가".repeat(50);
    t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "l.csv", text: csv(999, teams([long])) }] });
    const stored = t.loadView(code, null)!.groups[0].rounds[0].players[0].team;
    expect(stored.length).toBe(40);
    t.applyOp(code, owner, { op: "add_penalty", group: 0, team: stored, round: 1, kind: "rule", points: 5, reason: "지각" });
    expect(t.loadView(code, null)!.groups[0].penalties[0].team).toBe(stored);
  });

  it("마지막 수정 24시간이 지난 대회와 남은 사용자를 지운다", () => {
    const code = t.createTournament(stranger, { name: "만료", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    db.db().prepare("UPDATE tournaments SET updated_at = ? WHERE code = ?").run(Date.now() - 25 * 3600_000, code);
    const r = t.cleanup();
    expect(r.tournaments).toBeGreaterThanOrEqual(1);
    expect(t.loadView(code, null)).toBeNull();
  });

  it("운영자가 아닌 사람에게는 있는 코드와 없는 코드에 같은 오류를 낸다", () => {
    const code = t.createTournament(owner, { name: "숨김", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const NOT_OP = /^없는 대회이거나 이 대회의 운영자가 아닙니다\.$/;
    for (const c of [code, "ZZZZZ3"]) {
      expect(() => t.members(c, stranger)).toThrow(NOT_OP);
      expect(() => t.applyOp(c, stranger, { op: "set_weather", group: 0, round: 1, sub: "무풍" })).toThrow(NOT_OP);
      expect(() => t.removeMember(c, stranger, stranger.id)).toThrow(NOT_OP);
      expect(() => t.transferOwner(c, stranger, owner.id)).toThrow(NOT_OP);
      expect(() => t.deleteTournament(c, stranger, "숨김")).toThrow(NOT_OP);
    }
    t.acceptInvite(t.createInvite(code, owner), op);
    expect(() => t.createInvite(code, op)).toThrow(/^개최자만 할 수 있습니다\.$/);
  });

  it("내보낸 운영자는 전에 받은 링크로 돌아오지 못하고, 내보낸 뒤 만든 링크로는 들어온다", () => {
    const other = { id: "4", name: "다른 사람", avatar: null };
    db.db().prepare("INSERT OR IGNORE INTO users(id, name, avatar, updated_at) VALUES (?, ?, NULL, ?)").run(other.id, other.name, Date.now());
    const code = t.createTournament(owner, { name: "내보내기", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    const token = t.createInvite(code, owner, 3);
    t.acceptInvite(token, op);
    t.removeMember(code, owner, op.id);
    expect(() => t.acceptInvite(token, op)).toThrow("이 링크로는 다시 참여할 수 없습니다. 개최자에게 새 링크를 요청해주세요.");
    expect(t.acceptInvite(token, other)).toEqual({ code, already: false });
    const until = Date.now() + 2;
    while (Date.now() < until);
    expect(t.acceptInvite(t.createInvite(code, owner), op)).toEqual({ code, already: false });

    const minted = t.createInvite(code, owner);
    t.transferOwner(code, owner, op.id);
    t.removeMember(code, op, owner.id);
    expect(() => t.acceptInvite(minted, owner)).toThrow("인원이 다 찼거나 취소된 초대 링크입니다.");
  });

  it("개최자를 넘기고 스스로 나간 사람은 개최자일 때 만든 링크로 돌아오지 못하고, 그 링크는 다른 사람이 그대로 쓴다", () => {
    const other = { id: "5", name: "새 운영자", avatar: null };
    db.db().prepare("INSERT OR IGNORE INTO users(id, name, avatar, updated_at) VALUES (?, ?, NULL, ?)").run(other.id, other.name, Date.now());
    const code = t.createTournament(owner, { name: "넘기고 나가기", mode: "points", preset: "masters", plannedRounds: 4, groupCount: 1 });
    t.acceptInvite(t.createInvite(code, owner), op);
    const minted = t.createInvite(code, owner, 3);
    t.transferOwner(code, owner, op.id);
    t.removeMember(code, owner, owner.id);
    expect(() => t.acceptInvite(minted, owner)).toThrow("이 링크로는 다시 참여할 수 없습니다. 개최자에게 새 링크를 요청해주세요.");
    expect(t.acceptInvite(minted, other)).toEqual({ code, already: false });
    const until = Date.now() + 2;
    while (Date.now() < until);
    expect(t.acceptInvite(t.createInvite(code, op), owner)).toEqual({ code, already: false });
  });

  it("감점 되살리기와 체크포인트 수동 판정도 조마다 300건을 넘지 않는다", () => {
    const code = t.createTournament(owner, { name: "상한", mode: "checkpoint", preset: "masters", plannedRounds: 12, groupCount: 2 });
    const tid = (db.db().prepare("SELECT id FROM tournaments WHERE code = ?").get(code) as { id: number }).id;
    const ins = db.db().prepare("INSERT INTO penalties(tournament_id, group_idx, team, round_no, kind, count, points, reason, deleted_at, created_at) VALUES (?, ?, 't', 1, 'rule', 1, 1, 'x', ?, ?)");
    for (let i = 0; i < 300; i++) ins.run(tid, 0, null, Date.now());
    const gone = Number(ins.run(tid, 0, Date.now(), Date.now()).lastInsertRowid);
    const other = Number(ins.run(tid, 1, Date.now(), Date.now()).lastInsertRowid);
    expect(() => t.applyOp(code, owner, { op: "restore_penalty", id: gone })).toThrow("한 조에 감점은 300건까지 둘 수 있습니다.");
    t.applyOp(code, owner, { op: "update_settings", groupCount: 1 });
    expect(() => t.applyOp(code, owner, { op: "restore_penalty", id: other })).toThrow("지금 대회 설정의 라운드 수나 조 수를 벗어난 감점이라 되살릴 수 없습니다.");
    const set = db.db().prepare("INSERT INTO overrides(tournament_id, group_idx, round_no, team, state) VALUES (?, 0, ?, ?, 1)");
    for (let i = 0; i < 300; i++) set.run(tid, (i % 12) + 1, `team${i}`);
    expect(() => t.applyOp(code, owner, { op: "set_checkpoint", group: 0, round: 1, team: "새 팀", state: true })).toThrow("한 조에 체크포인트 수동 판정은 300건까지 할 수 있습니다.");
    t.applyOp(code, owner, { op: "set_checkpoint", group: 0, round: 1, team: "team0", state: false });
    const late = Number(
      db.db().prepare("INSERT INTO penalties(tournament_id, group_idx, team, round_no, kind, count, points, reason, deleted_at, created_at) VALUES (?, 0, 't', 12, 'rule', 1, 1, 'x', ?, ?)").run(tid, Date.now(), Date.now()).lastInsertRowid,
    );
    t.applyOp(code, owner, { op: "update_settings", plannedRounds: 11 });
    expect(() => t.applyOp(code, owner, { op: "restore_penalty", id: late })).toThrow("지금 대회 설정의 라운드 수나 조 수를 벗어난 감점이라 되살릴 수 없습니다.");
  });

  it("id가 정수가 아닌 라운드와 감점 요청은 없는 기록으로 거부한다", () => {
    const code = t.createTournament(owner, { name: "잘못된 id", mode: "points", preset: "masters", plannedRounds: 1, groupCount: 1 });
    for (const id of [undefined, [1], { a: 1 }, "1", 1.5]) {
      expect(() => t.applyOp(code, owner, { op: "delete_round", id } as unknown as Op)).toThrow("없는 라운드입니다.");
      expect(() => t.applyOp(code, owner, { op: "restore_penalty", id } as unknown as Op)).toThrow("없는 감점입니다.");
    }
  });

  it("로그아웃하면 그 계정의 다른 기기 세션도 끝나고 다른 계정의 세션은 남는다", async () => {
    const auth = await import("../../src/er/server/auth");
    const n = (uid: string) => (db.db().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(uid) as { n: number }).n;
    const phone = auth.createSession(owner);
    auth.createSession(owner);
    auth.createSession(op);
    const others = n(op.id);
    auth.deleteSessions(phone.id);
    expect([n(owner.id), n(op.id)]).toEqual([0, others]);
  });

  it("만료된 세션으로 로그아웃하면 그 세션만 지우고 다른 기기 세션은 남긴다", async () => {
    const auth = await import("../../src/er/server/auth");
    const n = () => (db.db().prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(stranger.id) as { n: number }).n;
    const old = auth.createSession(stranger);
    auth.createSession(stranger);
    const before = n();
    db.db().prepare("UPDATE sessions SET expires_at = 0 WHERE hash = ?").run(createHash("sha256").update(old.id).digest("hex"));
    auth.deleteSessions(old.id);
    expect(n()).toBe(before - 1);
  });

  const post = (body: BodyInit) => new Request("http://localhost/api/t", { method: "POST", body, duplex: "half" } as RequestInit);
  const bodyStatus = async (body: BodyInit) => {
    const { handle, readJson } = await import("../../src/er/server/http");
    const res = await handle(async () => {
      await readJson(post(body));
      return new Response();
    });
    return res.status;
  };

  it("JSON 본문이 객체가 아니면 형식 오류로 400을 낸다", async () => {
    const { readJson } = await import("../../src/er/server/http");
    for (const body of ["null", "[]", "1", '"x"']) await expect(readJson(post(body))).rejects.toThrow(SyntaxError);
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
    expect(await bodyStatus("null")).toBe(400);
  });

  it("길이를 밝히지 않은 본문도 6MB를 넘는 순간 읽기를 멈추고 413을 낸다", async () => {
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled++;
        c.enqueue(new Uint8Array(1024 * 1024));
      },
    });
    expect(await bodyStatus(endless)).toBe(413);
    expect(pulled).toBeLessThan(12);
    // 글자 수로는 6M보다 적어도 UTF-8 바이트로 6MB를 넘으면 막음
    expect(await bodyStatus(JSON.stringify({ a: "가".repeat(2_200_000) }))).toBe(413);
    expect(await bodyStatus(JSON.stringify({ a: "가".repeat(100) }))).toBe(200);
  });

  it("창이 끝난 요청 제한 기록은 정리할 때 지운다", async () => {
    const limits = await import("../../src/limits");
    const map = (globalThis as unknown as { __limits: Map<string, unknown> }).__limits;
    limits.allow("page:203.0.113.1", 5, 1000);
    limits.sweep(Date.now() + 500);
    expect(map.has("page:203.0.113.1")).toBe(true);
    limits.sweep(Date.now() + 1500);
    expect(map.has("page:203.0.113.1")).toBe(false);
  });

  it("같은 라운드를 여러 번 바꿔도 지운 기록은 최근 세 개만 남고 되돌리기는 된다", () => {
    const code = t.createTournament(owner, { name: "교체 반복", mode: "points", preset: "masters", plannedRounds: 1, groupCount: 1 });
    const count = () => db.db().prepare("SELECT COUNT(*) AS n, SUM(deleted_at IS NOT NULL) AS d FROM rounds WHERE tournament_id = (SELECT id FROM tournaments WHERE code = ?)").get(code);
    let r = t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "0.csv", text: csv(1000, teams(["가"])) }] });
    for (let i = 1; i <= 10; i++) r = t.applyOp(code, owner, { op: "add_csv", group: 0, round: 1, files: [{ name: `${i}.csv`, text: csv(1000 + (i % 2), teams(["가"])) }] });
    expect(count()).toEqual({ n: 4, d: 3 });
    t.applyOp(code, owner, r.undo!.op);
    expect(t.loadView(code, null)!.groups[0].rounds.map((x) => x.gameId)).toEqual([1001]);
    expect(count()).toEqual({ n: 4, d: 3 });
    const del = t.applyOp(code, owner, { op: "delete_round", id: t.loadView(code, null)!.groups[0].rounds[0].id });
    expect(count()).toEqual({ n: 3, d: 3 });
    t.applyOp(code, owner, del.undo!.op);
    expect(t.loadView(code, null)!.groups[0].rounds.map((x) => x.gameId)).toEqual([1001]);
  });

  it("같은 라운드를 연달아 바꿔도 먼저 뜬 되돌리기 알림으로 처음 기록을 되살린다", () => {
    const code = t.createTournament(owner, { name: "연속 교체", mode: "points", preset: "masters", plannedRounds: 1, groupCount: 1 });
    t.applyOp(code, owner, { op: "add_csv", group: 0, files: [{ name: "a.csv", text: csv(2000, teams(["가"])) }] });
    const first = t.applyOp(code, owner, { op: "add_csv", group: 0, round: 1, files: [{ name: "b.csv", text: csv(2001, teams(["가"])) }] });
    t.applyOp(code, owner, { op: "add_csv", group: 0, round: 1, files: [{ name: "c.csv", text: csv(2002, teams(["가"])) }] });
    t.applyOp(code, owner, first.undo!.op);
    expect(t.loadView(code, null)!.groups[0].rounds.map((x) => x.gameId)).toEqual([2000]);
  });

  it("정리한 행이 남긴 빈 페이지를 DB 파일에서 돌려준다", () => {
    const conn = db.db();
    expect(conn.prepare("PRAGMA auto_vacuum").get()).toEqual({ auto_vacuum: 2 });
    const code = t.createTournament(owner, { name: "파일 크기", mode: "points", preset: "masters", plannedRounds: 1, groupCount: 1 });
    const tid = (conn.prepare("SELECT id FROM tournaments WHERE code = ?").get(code) as { id: number }).id;
    const ins = conn.prepare("INSERT INTO rounds(tournament_id, group_idx, round_no, source, players, deleted_at, created_at) VALUES (?, 0, 1, 'csv', ?, ?, ?)");
    for (let i = 0; i < 200; i++) ins.run(tid, "x".repeat(40_000), Date.now() - 2 * 3600_000, Date.now());
    conn.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    const file = join(process.env.DATA_DIR!, "er-labs.db");
    const before = statSync(file).size;
    t.cleanup();
    expect(conn.prepare("SELECT COUNT(*) AS n FROM rounds WHERE tournament_id = ?").get(tid)).toEqual({ n: 0 });
    expect(conn.prepare("PRAGMA freelist_count").get()).toEqual({ freelist_count: 0 });
    expect(statSync(file).size).toBeLessThan(before - 7_000_000);
  });
});
