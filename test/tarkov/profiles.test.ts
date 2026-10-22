import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MODES } from "@/tarkov/lib/modes";
import { db } from "@/tarkov/server/db";
import { allow } from "@/tarkov/server/limits";
import { load, search } from "@/tarkov/server/profiles";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "tarkov-labs-test-"));
afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
});

const pvp = MODES.find((m) => m.key === "pvp")!;
const fixture = (aid: number) => readFileSync(join(__dirname, "fixtures/profile", `${aid}.json`), "utf8");
const lanes = (globalThis as unknown as { __tlLanes: Record<string, { next: number }> }).__tlLanes;
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
    const all = await Promise.all(Array.from({ length: 5 }, () => load(pvp, 1001)));
    expect(calls).toHaveLength(1);
    expect(all.every((r) => r.summary?.aid === 1001 && !r.error)).toBe(true);
  });

  it("대기열이 5초 넘게 밀려 있으면 기다리지 않고 마지막 기록으로 답한다", async () => {
    lanes.view.next = Date.now() + 60_000;
    const t = Date.now();
    const r = await load(pvp, 1002);
    expect(Date.now() - t).toBeLessThan(500);
    expect(calls).toHaveLength(0);
    expect(r).toMatchObject({ stale: true, error: true });
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
    const [shared, fresh] = await Promise.all([load(pvp, 1002), load(pvp, 1002, true)]);
    expect(calls).toHaveLength(2);
    expect([shared.error, fresh.error]).toEqual([false, false]);
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
