import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/icon/[tpl]/route";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "tarkov-icon-test-"));
afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
});

describe("아이콘 프록시", () => {
  it("tarkov.dev에 없는 그림은 1시간 동안 다시 묻지 않고, 받지 못한 경우는 다시 묻는다", async () => {
    const tpl = "5447a9cd4bdc2dbd208b4567";
    const calls: string[] = [];
    let status = 503;
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return new Response(null, { status });
    });
    const get = (q = "") => GET(new Request(`http://localhost/api/icon/${tpl}${q}`), { params: Promise.resolve({ tpl }) });
    expect((await get()).status).toBe(404);
    expect((await get()).status).toBe(404);
    expect(calls).toHaveLength(2);
    status = 404;
    await get();
    await get();
    expect(calls).toHaveLength(3);
    const base = await get("?v=base");
    expect(base.headers.get("content-type")).toBe("image/gif");
    const asked = calls.length;
    await get("?v=base");
    expect(calls).toHaveLength(asked);
  });
});
