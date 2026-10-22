import { afterEach, describe, expect, it, vi } from "vitest";
import { MODES } from "@/tarkov/lib/modes";
import { profileImage } from "@/tarkov/server/og";

afterEach(() => vi.unstubAllGlobals());

describe("프로필 미리보기 이미지", () => {
  it("Pretendard에 없는 글자가 든 이름도 외부 글꼴을 받지 않고 그린다", async () => {
    const calls: string[] = [];
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).startsWith("data:")) return real(url);
      calls.push(String(url));
      return new Response("", { status: 404 });
    });
    const img = await profileImage(`Player${String.fromCodePoint(0x1f600, 0x4e2d)}`, MODES[0], null, null);
    expect((await img.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    expect(calls).toEqual([]);
  });
});
