import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    const err = (fn: () => unknown) => {
      try {
        fn();
        return "통과";
      } catch (e) {
        return (e as Error).message;
      }
    };
    for (const c of [code, "ZZZZZ3"]) {
      expect(err(() => t.members(c, stranger))).toBe("없는 대회이거나 이 대회의 운영자가 아닙니다.");
      expect(err(() => t.applyOp(c, stranger, { op: "set_weather", group: 0, round: 1, sub: "무풍" }))).toBe("없는 대회이거나 이 대회의 운영자가 아닙니다.");
      expect(err(() => t.removeMember(c, stranger, stranger.id))).toBe("없는 대회이거나 이 대회의 운영자가 아닙니다.");
      expect(err(() => t.transferOwner(c, stranger, owner.id))).toBe("없는 대회이거나 이 대회의 운영자가 아닙니다.");
      expect(err(() => t.deleteTournament(c, stranger, "숨김"))).toBe("없는 대회이거나 이 대회의 운영자가 아닙니다.");
    }
    t.acceptInvite(t.createInvite(code, owner), op);
    expect(err(() => t.createInvite(code, op))).toBe("개최자만 할 수 있습니다.");
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
