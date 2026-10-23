import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MODES } from "@/tarkov/lib/modes";
import { crawl } from "@/tarkov/server/baseline";
import { db, getMeta } from "@/tarkov/server/db";
import { runIndex } from "@/tarkov/server/indexer";
import { allow } from "@/limits";
import { account, load, search } from "@/tarkov/server/profiles";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "tarkov-labs-test-"));
afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
});

const pvp = MODES.find((m) => m.key === "pvp")!;
const pve = MODES.find((m) => m.key === "pve")!;
const IP = "203.0.113.1";
const fixture = (aid: number) => readFileSync(join(__dirname, "fixtures/profile", `${aid}.json`), "utf8");
const lanes = (globalThis as unknown as { __tlLanes: Record<string, { gap: number; next: number }> }).__tlLanes;
let calls: string[] = [];

beforeEach(() => {
  calls = [];
  lanes.view.next = 0;
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    await new Promise((r) => setTimeout(r, 30));
    return new Response(fixture(Number(url.match(/(\d+)\.json$/)![1])), { status: 200 });
  });
});

describe("프로필 업스트림 조회", () => {
  it("같은 계정을 동시에 열면 업스트림은 한 번만 부른다", async () => {
    const all = await Promise.all(Array.from({ length: 5 }, () => load(pvp, 1001, false, IP)));
    expect(calls).toHaveLength(1);
    expect(all.every((r) => r.summary?.aid === 1001 && !r.error)).toBe(true);
  });

  it("대기열이 5초 넘게 밀려 있으면 기다리지 않고 마지막 기록으로 답한다", async () => {
    lanes.view.next = Date.now() + 60_000;
    const t = Date.now();
    const r = await load(pvp, 1002, false, IP);
    expect(Date.now() - t).toBeLessThan(500);
    expect(calls).toHaveLength(0);
    expect(r).toMatchObject({ stale: true, error: true, limited: true });
  });

  it("IP마다 분당 30번 넘게 업스트림을 부르면 마지막 기록으로 답한다", async () => {
    for (let i = 0; i < 30; i++) allow("u:203.0.113.9", 30, 60_000);
    const r = await load(pvp, 1003, false, "203.0.113.9");
    expect(calls).toHaveLength(0);
    expect(r).toMatchObject({ stale: true, error: true });
    expect((await load(pvp, 1003, false, "203.0.113.10")).error).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("다시 불러오기는 진행 중인 조회에 붙지 않고 새로 부른다", async () => {
    const [shared, fresh] = await Promise.all([load(pvp, 1002, false, IP), load(pvp, 1002, true, IP)]);
    expect(calls).toHaveLength(2);
    expect([shared.error, fresh.error]).toEqual([false, false]);
  });

  it("IP마다 업스트림 호출은 동시에 계정 2개까지 하고, 같은 계정의 다른 모드와 끝난 뒤의 호출은 받는다", async () => {
    const ip = "203.0.113.20";
    const [a, a2, b, c] = await Promise.all([load(pvp, 1001, true, ip), load(pve, 1001, true, ip), load(pvp, 1002, true, ip), load(pvp, 1003, true, ip)]);
    expect(calls).toHaveLength(3);
    expect([a.error, a2.error, b.error]).toEqual([false, false, false]);
    expect(c).toMatchObject({ stale: true, error: true, limited: true });
    expect((await load(pvp, 1003, true, ip)).error).toBe(false);
    expect(calls).toHaveLength(4);
  });
});

describe("이름 검색", () => {
  it("짧은 접두어는 이름순 앞 500개 안에서 고르고, 숫자 한 자리로는 이름을 찾지 않는다", () => {
    const ins = db().prepare("INSERT INTO accounts (aid, name, name_lc, u_pvp) VALUES (?, ?, ?, ?)");
    for (let i = 0; i < 2000; i++) ins.run(100_000 + i, `Ma${String(i).padStart(4, "0")}`, `ma${String(i).padStart(4, "0")}`, i + 1);
    ins.run(99, "Ma", "ma", 1);
    ins.run(98, "1abc", "1abc", 5000);
    expect(search("ma", 3).map((r) => r.name)).toEqual(["Ma", "Ma0498", "Ma0497"]);
    expect(search("1")).toEqual([]);
    expect(search("1a").map((r) => r.name)).toEqual(["1abc"]);
  });
});

describe("숨긴 계정", () => {
  const script = (name: string, ...args: string[]) => execFileSync(process.execPath, [join(__dirname, "../../scripts/tarkov", name), ...args]);
  const count = (sql: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${sql}`).get() as { n: number }).n;

  it("비교군 수집이 응답을 기다리는 사이 숨긴 계정은 통계를 다시 저장하지 않는다", async () => {
    const add = db().prepare("INSERT INTO accounts (aid, name, name_lc, u_season) VALUES (?, ?, ?, ?)");
    add.run(5001, "Crawl", "crawl", Date.now() - 1000);
    add.run(5002, "Kept", "kept", Date.now() - 2000);
    lanes.crawl.gap = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.endsWith("/5001.json")) script("hide.mjs", "5001");
      return new Response(readFileSync(join(__dirname, "fixtures/pvp-season/1001.json")), { status: 200 });
    });
    const row = (aid: number) => db().prepare("SELECT updated, n FROM baseline WHERE mode = 'season' AND aid = ?").get(aid) as { updated: number; n: number } | undefined;
    expect(await crawl()).toBe(2);
    expect(row(5001)).toBeUndefined();
    expect(row(5002)?.n).toBeGreaterThan(0);
    const next = Date.now();
    db().prepare("UPDATE accounts SET u_season = ? WHERE aid = 5002").run(next);
    expect(await crawl()).toBe(1);
    expect(row(5002)?.updated).toBe(next);
    expect(calls.filter((u) => u.endsWith("/5001.json"))).toHaveLength(1);
    lanes.crawl.gap = 1000;
  });

  it("삭제 요청을 처리하면 계정 정보, 검색, 조회에서 빠지고 색인을 다시 받아도 계정 행이 생기지 않는다", async () => {
    db().prepare("INSERT OR REPLACE INTO accounts (aid, name, name_lc) VALUES (1001, 'Fixture-Alpha', 'fixture-alpha')").run();
    script("hide.mjs", "1001");
    expect(account(1001)).toBeNull();
    expect(search("1001")).toEqual([]);
    expect(search("fixture-alpha")).toEqual([]);
    expect(await load(pvp, 1001, true, IP)).toEqual({ summary: null, stale: false, error: false });
    expect(calls).toEqual([]);
    vi.stubGlobal("fetch", async (url: string) => {
      const m = url.match(/\/([\w-]+)\/(index|updated)\.json$/);
      const file = m ? join(__dirname, "fixtures", m[1], `${m[2]}.json`) : "";
      return existsSync(file) ? new Response(readFileSync(file), { headers: { "last-modified": new Date().toUTCString() } }) : new Response(null, { status: 304 });
    });
    expect(await runIndex()).toBe(true);
    expect(getMeta("index:profile/index.json")).not.toBeNull();
    expect(count("accounts WHERE aid = 1001")).toBe(0);
  });

  it("백업을 복원해도 숨긴 계정의 기록은 되살아나지 않는다", () => {
    const backup = join(process.env.DATA_DIR!, ".backup-tarkov-labs.db");
    const snap = db().prepare("INSERT INTO snapshots (aid, mode, updated, fetched_at, data) VALUES (?, 'pvp', 1, 1, '{}')");
    const name = db().prepare("INSERT INTO names (aid, old_name, new_name, seen_at) VALUES (?, 'old', 'new', 1)");
    for (const aid of [6001, 6002]) {
      snap.run(aid);
      name.run(aid);
    }
    script("backup.mjs");
    // 백업 뒤에 들어온 삭제 요청과, 복원 전에 색인이 다시 만든 숨긴 계정 행
    script("hide.mjs", "6002");
    db().exec("DELETE FROM names; DELETE FROM snapshots; DELETE FROM hidden WHERE aid = 1001; INSERT INTO accounts (aid, name, name_lc) VALUES (1001, 'Fixture-Alpha', 'fixture-alpha')");
    script("restore.mjs", backup);
    script("restore.mjs", backup);
    expect([count("names WHERE aid = 6001"), count("snapshots WHERE aid = 6001")]).toEqual([1, 1]);
    expect([count("names WHERE aid = 6002"), count("snapshots WHERE aid = 6002")]).toEqual([0, 0]);
    expect(count("hidden WHERE aid IN (1001, 5001, 6002)")).toBe(3);
    expect(count("accounts WHERE aid = 1001")).toBe(0);
  });

  it("트리거가 생기기 전에 숨긴 계정의 계정 행은 DB를 다시 열 때 지운다", () => {
    db().exec("DROP TRIGGER hidden_purge; INSERT INTO accounts (aid, name, name_lc) VALUES (7001, 'Legacy', 'legacy'); INSERT INTO hidden (aid, at) VALUES (7001, 0)");
    expect(count("accounts WHERE aid = 7001")).toBe(1);
    const g = globalThis as unknown as { __tlDb?: { close(): void } };
    g.__tlDb!.close();
    g.__tlDb = undefined;
    expect(count("accounts WHERE aid = 7001")).toBe(0);
    expect(count("sqlite_master WHERE type = 'trigger' AND name = 'hidden_purge'")).toBe(1);
  });
});
