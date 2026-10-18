import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { csv } from "./helpers";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "er-tools-test-"));

const owner = { id: "1", name: "개최자", avatar: null };
const op = { id: "2", name: "운영자", avatar: null };
const stranger = { id: "3", name: "남", avatar: null };

type T = typeof import("../src/server/tournament");
let t: T;
let db: typeof import("../src/server/db");

beforeAll(async () => {
  db = await import("../src/server/db");
  t = await import("../src/server/tournament");
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
    expect(r.notices).toEqual(["A조 1라운드에 추가했습니다, 2팀", "A조 2라운드에 추가했습니다, 2팀"]);
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
    expect(() => t.applyOp(code, stranger, { op: "set_weather", group: 0, round: 1, sub: "무풍" })).toThrow("이 대회의 운영자만 바꿀 수 있습니다.");
    const token = t.createInvite(code, owner);
    expect(t.acceptInvite(token, op)).toEqual({ code, already: false });
    expect(() => t.acceptInvite(token, stranger)).toThrow("이미 사용했거나 취소된 초대 링크입니다.");
    expect(() => t.applyOp(code, op, { op: "update_settings", name: "바꿈" })).toThrow("대회 설정은 개최자만 바꿀 수 있습니다.");
    expect(() => t.createInvite(code, op)).toThrow("개최자만 할 수 있습니다.");
    t.transferOwner(code, owner, op.id);
    expect(t.loadView(code, op)!.role).toBe("owner");
    expect(t.loadView(code, owner)!.role).toBe("operator");
    t.removeMember(code, op, owner.id);
    expect(t.loadView(code, owner)!.role).toBeNull();
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
    expect(bad([{ team: "A", placement: 0, killScore: 0 }])).toThrow("순위는 1부터 24까지의 정수로");
    expect(bad([{ team: "A", placement: "3", killScore: 0 }])).toThrow("순위는 1부터 24까지의 정수로");
    expect(bad([{ team: "A", placement: 1, killScore: 0 }, { team: "B", placement: 1, killScore: 0 }])).toThrow("같은 순위를 두 팀에");
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
});
