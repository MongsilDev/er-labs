import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Penalties, Teams } from "../../src/er/components/t/Side";
import { computeGroup, type GroupInput } from "../../src/er/lib/engine";
import { presetRules } from "../../src/er/lib/rules";
import type { GroupView } from "../../src/er/lib/view";
import { round } from "./helpers";

// 운영자가 정한 이름이 Object.prototype 속성과 같아도 운영 패널이 글자로 그림
describe("운영 패널", () => {
  it("constructor, __proto__ 같은 팀 이름도 오류 없이 표시한다", () => {
    const rules = presetRules("masters");
    const rounds = [round(1, 1, [{ team: "Alpha", place: 1, ks: 0 }])];
    const penalties = [{ id: 1, team: "__proto__", roundNo: 1, kind: "rule" as const, count: 1, points: 1, reason: "지각" }];
    const aliases = { x: "constructor" };
    const input: GroupInput = { mode: "points", rules, plannedRounds: 4, rounds, penalties, weather: [], aliases, overrides: {} };
    const result = computeGroup(input);
    const group = { idx: 0, label: "A", rounds: [], penalties, weather: [], aliases, overrides: {} } as unknown as GroupView;
    const run = async () => null;
    const html = renderToStaticMarkup(createElement(Penalties, { group, result, rules, run })) + renderToStaticMarkup(createElement(Teams, { group, result, mode: "points", rules, run }));
    expect(html).toContain("__proto__");
    expect(html).toContain("constructor");
  });
});
