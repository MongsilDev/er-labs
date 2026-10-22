import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MODES } from "@/tarkov/lib/modes";
import { allow } from "@/tarkov/server/limits";
import { load } from "@/tarkov/server/profiles";

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
