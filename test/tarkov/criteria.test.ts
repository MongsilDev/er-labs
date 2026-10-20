import { describe, expect, it } from "vitest";
import { quantile, rank, rankLabel, shareOf, topPct } from "@/tarkov/lib/criteria";

describe("상위 N%", () => {
  it("상위 10%, 1% 값과 같은 기준", () => {
    const vals = Array.from({ length: 101 }, (_, i) => i);
    expect(topPct(1 - rank(vals, quantile(vals, 0.9)))).toBe(10);
    expect(topPct(1 - rank(vals, 90.5))).toBe(10);
    expect(topPct(1 - rank(vals, 91))).toBe(9);
    expect(topPct(1 - rank(vals, 99.5))).toBe(1);
    expect(topPct(1 - rank(vals, 500))).toBe(1);
    expect(topPct(1 - rank(vals, -3))).toBe(100);
  });

  it("같은 값이 많으면 경계값은 기준을 넘지 않은 것으로 셈", () => {
    const vals = [...Array(50).fill(1), ...Array(40).fill(2), ...Array(11).fill(3)];
    expect(quantile(vals, 0.9)).toBe(3);
    expect(topPct(1 - rank(vals, 3))).toBeGreaterThanOrEqual(10);
  });
});

describe("순위 문구", () => {
  it("중앙값 아래는 하위로", () => {
    expect(rankLabel(0.004)).toBe("상위 1%");
    expect(rankLabel(0.5)).toBe("상위 50%");
    expect(rankLabel(0.97)).toBe("하위 3%");
    expect(rankLabel(1)).toBe("하위 1%");
  });
});

describe("배지별 비율", () => {
  it("판정 불가는 빼고 소수 첫째 자리", () => {
    const states = [...Array(90).fill("clear"), ...Array(7).fill("warn"), ...Array(3).fill("alert"), ...Array(40).fill("none")];
    expect(shareOf(states)).toEqual({ accounts: 100, clear: 90, warn: 7, alert: 3 });
    expect(shareOf(["clear", "clear", "warn"]).warn).toBe(33.3);
    expect(shareOf([]).accounts).toBe(0);
  });
});
