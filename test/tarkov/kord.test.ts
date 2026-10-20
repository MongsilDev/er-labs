import { afterEach, describe, expect, it, vi } from "vitest";
import { PERSONAL, decodeBuild, encodeBuild } from "@/tarkov/lib/kord";

const sorted = PERSONAL.map((p) => p.id).sort();

describe("빌드 코드", () => {
  it("현재 특성 목록으로 왕복 복원", () => {
    expect(encodeBuild([sorted[0]])).toBe("1");
    expect(decodeBuild("1")).toEqual([sorted[0]]);
    expect(decodeBuild(encodeBuild(sorted))).toEqual(sorted);
    expect(decodeBuild(encodeBuild([sorted[1], sorted.at(-1)!]))).toEqual([sorted[1], sorted.at(-1)]);
  });
  it("형식이 틀린 코드는 빈 선택", () => {
    expect(decodeBuild("")).toEqual([]);
    expect(decodeBuild("A1")).toEqual([]);
    expect(decodeBuild("-1")).toEqual([]);
  });
});

describe("빌드 코드 53개 한도", () => {
  afterEach(() => {
    vi.doUnmock("@/tarkov/data/season.json");
    vi.resetModules();
  });

  const load = async () => {
    const personal = Array.from({ length: 53 }, (_, i) => ({ id: `p${String(i).padStart(2, "0")}`, name: "", en: "", effects: [] }));
    vi.resetModules();
    vi.doMock("@/tarkov/data/season.json", () => ({ default: { name: "", common: [], personal } }));
    const kord = await import("@/tarkov/lib/kord");
    return { ...kord, ids: personal.map((p) => p.id) };
  };

  it("50번째 이후 비트도 왕복 복원", async () => {
    const { encodeBuild, decodeBuild, ids } = await load();
    for (const sel of [[ids[50]], [ids[51]], [ids[52]], [ids[0], ids[50], ids[51], ids[52]], ids]) {
      expect(decodeBuild(encodeBuild(sel))).toEqual(sel);
    }
    expect(encodeBuild(ids)).toBe((2 ** 53 - 1).toString(36));
    expect(encodeBuild(ids)).toHaveLength(11);
  });

  it("정밀도를 넘는 코드는 빈 선택", async () => {
    const { decodeBuild } = await load();
    expect(decodeBuild((2 ** 53).toString(36))).toEqual([]);
    expect(decodeBuild("zzzzzzzzzzz")).toEqual([]);
    expect(decodeBuild("100000000000")).toEqual([]);
  });
});
