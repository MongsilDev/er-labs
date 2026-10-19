import { describe, expect, it } from "vitest";
import { FlatJsonReader } from "@/tarkov/lib/flatjson";

function readAll(text: string, size: number) {
  const out: [string, string | number][] = [];
  const r = new FlatJsonReader((k, v) => out.push([k, v]));
  for (let i = 0; i < text.length; i += size) r.push(text.slice(i, i + size));
  return out;
}

describe("FlatJsonReader", () => {
  const obj = { "1": "Alpha", "22": "Bra\"vo", "333": "C\\d", "4": 1786624779934, "5": "TarkovCitizen123" };
  const text = JSON.stringify(obj);
  it("조각 크기와 관계없이 같은 결과", () => {
    const want = Object.entries(obj);
    for (const size of [1, 2, 3, 7, 50, 1000]) expect(readAll(text, size)).toEqual(want);
  });
  it("공백과 줄바꿈이 있어도 읽음", () => {
    expect(readAll('{\n "1": "a",\n "2": 3\n}', 4)).toEqual([["1", "a"], ["2", 3]]);
  });
});
