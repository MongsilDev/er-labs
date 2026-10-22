import { describe, expect, it } from "vitest";
import { between, chance, chanceLabel, daysLeft, quitRp } from "../../src/er/lib/cut";

describe("이터컷 계산", () => {
  it("사이 인원은 양 끝을 빼고 세고, 순위표 밖이면 모른다", () => {
    const rps = [9300, 9200, 9100, 9100, 9000, 8900];
    expect(between(rps, 9000, 9200)).toBe(2);
    expect(between(rps, 9250, 9050)).toBe(3);
    expect(between(rps, 8800, 9000)).toBeNull();
  });

  it("가능성은 가운데 값에서 반반, 낮은 값과 높은 값에서 10%와 90%", () => {
    expect(chance(9380, 9380, 9200, 9480)).toBeCloseTo(0.5, 2);
    expect(chance(9200, 9380, 9200, 9480)).toBeCloseTo(0.1, 2);
    expect(chance(9480, 9380, 9200, 9480)).toBeCloseTo(0.9, 2);
    expect(chanceLabel(0.5)).toBe("중간");
    expect(chanceLabel(0.95)).toBe("높음");
  });

  it("쉬면 깎인 RP는 메테오라이트 4 아래로 내려가지 않는다", () => {
    expect(quitRp(9050, 8, 100, 6400)).toBe(8250);
    expect(quitRp(6600, 8, 100, 6400)).toBe(6400);
    expect(quitRp(6000, 8, 100, 6400)).toBe(6000);
  });

  it("남은 날은 KST 날짜 차이", () => {
    const end = Date.parse("2026-11-12T09:00:00+09:00");
    expect(daysLeft(end, Date.parse("2026-10-20T00:30:00+09:00"))).toBe(23);
    expect(daysLeft(end, Date.parse("2026-11-12T08:00:00+09:00"))).toBe(0);
  });
});
