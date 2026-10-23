import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/icon/[tpl]/route";
import { allow } from "@/limits";

const req = vi.hoisted(() => ({ ip: "" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": req.ip }) }));

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "tarkov-icon-test-"));
afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
});

let calls: string[] = [];
let status = 200;
beforeEach(() => {
  calls = [];
  status = 200;
  req.ip = "203.0.113.30";
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    await new Promise((r) => setTimeout(r, 20));
    return status === 200 ? new Response(new Uint8Array([1, 2, 3])) : new Response(null, { status });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const get = (tpl: string, q = "") => GET(new Request(`http://localhost/api/icon/${tpl}${q}`), { params: Promise.resolve({ tpl }) });
const maxAge = (r: Response) => Number(r.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1]);

describe("아이콘 프록시", () => {
  it("tarkov.dev에 없는 그림은 1시간, 받지 못한 그림은 5분 동안 다시 묻지 않고 그동안만 캐시하게 한다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const tpl = "5447a9cd4bdc2dbd208b4567";
    status = 503;
    const first = await get(tpl);
    expect([first.status, maxAge(first)]).toEqual([404, 300]);
    await get(tpl);
    expect(calls).toHaveLength(1);
    vi.setSystemTime(Date.now() + 301_000);
    status = 404;
    expect(maxAge(await get(tpl))).toBe(3600);
    await get(tpl);
    expect(calls).toHaveLength(2);
    const base = await get(tpl, "?v=base");
    expect(base.headers.get("content-type")).toBe("image/gif");
    const asked = calls.length;
    await get(tpl, "?v=base");
    expect(calls).toHaveLength(asked);
  });

  it("같은 그림을 동시에 요청하면 한 번만 받아 모두에게 주고 임시 파일을 남기지 않는다", async () => {
    const tpl = "5448bd6b4bdc2dfc2f8b4569";
    const all = await Promise.all(Array.from({ length: 5 }, () => get(tpl)));
    expect(calls).toHaveLength(1);
    expect(all.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    for (const r of all) expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(readdirSync(join(process.env.DATA_DIR!, "icons")).filter((f) => f.includes(tpl))).toEqual([`${tpl}.webp`]);
  });

  it("받아야 하는 그림은 IP마다 분당 120번까지 받고, 받아 둔 그림은 제한 없이 준다", async () => {
    const tpl = "54491bb74bdc2d09088b4567";
    const ip = "203.0.113.31";
    req.ip = ip;
    for (let i = 0; i < 120; i++) allow(`icon:${ip}`, 120, 60_000);
    const limited = await get(tpl);
    expect([limited.status, limited.headers.get("cache-control")]).toEqual([429, "no-store"]);
    expect(calls).toHaveLength(0);
    req.ip = "203.0.113.32";
    expect((await get(tpl)).status).toBe(200);
    req.ip = ip;
    expect((await get(tpl)).status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("받은 그림을 줄이다 실패하면 500 대신 빈 그림을 주고 5분 동안 다시 묻지 않는다", async () => {
    const tpl = "54491c4f4bdc2db1078b4568";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get(tpl, "?v=base");
    expect([res.status, res.headers.get("content-type"), maxAge(res)]).toEqual([200, "image/gif", 300]);
    await get(tpl, "?v=base");
    expect(calls).toHaveLength(1);
  });
});
