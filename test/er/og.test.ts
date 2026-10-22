import { afterEach, describe, expect, it, vi } from "vitest";
import { keepGlyphs } from "../../src/glyphs";
import { exampleView } from "../../src/er/lib/example";
import { boardImage } from "../../src/er/server/og";

afterEach(() => vi.unstubAllGlobals());

describe("OG 이미지", () => {
  it("Pretendard에 없는 글자가 든 대회 이름도 외부 글꼴을 받지 않고 그린다", async () => {
    const calls: string[] = [];
    const real = globalThis.fetch;
    // wasm은 data: 주소로 불러오므로 그대로 두고, 바깥 주소 요청만 셈
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).startsWith("data:")) return real(url);
      calls.push(String(url));
      return new Response("", { status: 404 });
    });
    const img = await boardImage({ ...exampleView(), name: `컵 ${String.fromCodePoint(0x20001, 0x1f600, 0x4e2d)}` }, 0);
    expect((await img.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    expect(calls).toEqual([]);
  });

  it("폭 없는 서식 문자만 남는 이름은 빈 문자열이 되어 대체 문구로 넘어간다", () => {
    const covered = new Set([0x200b, 0x200d, 0xac00, 0xb098]);
    expect(keepGlyphs(String.fromCodePoint(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467), covered)).toBe("");
    expect(keepGlyphs("가\u200b나", covered)).toBe("가나");
  });
});
