import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { championshipTeams, seasonStandings } from "../../src/er/lib/kel";
import { advanceOdds, certainty, finalState, standings, type Entry, type KillPool, type Round, type Row } from "../../src/er/lib/kel-calc";
import { kelCalcData, kelData } from "../../src/er/server/kel";
import { kelFixture } from "./helpers";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "er-labs-kel-"));
afterAll(() => rmSync(process.env.DATA_DIR!, { recursive: true, force: true }));

const e = (placement: number, killScore = 0, penalty = 0): Entry => ({ placement, killScore, penalty });
const TEAMS = "abcdefgh".split("");
const order = (keys: string[], extra: Record<string, Partial<Entry>> = {}): Round => Object.fromEntries(keys.map((k, i) => [k, { ...e(i + 1), ...extra[k] }]));

describe("KEL 정규 시즌", () => {
  it("서킷 포인트 합계로 결승 직행 4팀과 준결승 8팀을 나눈다", () => {
    const { seeds, semi } = championshipTeams();
    expect(seeds.map((t) => t.name)).toEqual(["GC 부산 스텔라", "대전 오토암즈", "인천 웨이브", "경북 어센더스"]);
    expect(semi.map((t) => t.name)).toEqual(["경남 스파클", "성남 락스", "충남 CNJ", "뉴 라이즈 강원", "전남 이스포츠", "대구 가디언즈", "FN 세종", "경기 이네이트"]);
    expect(
      seasonStandings()
        .map((r) => r.total)
        .slice(0, 4),
    ).toEqual([1900, 1880, 1680, 1240]);
  });
});

describe("KEL 진출 계산", () => {
  it("총점, 킬 점수, 마지막 라운드 순위 순서로 줄을 세운다", () => {
    const rounds: Round[] = [{ a: e(1), b: e(2, 3), c: e(3, 1), d: e(4, 2) }];
    expect(standings(["a", "b", "c", "d"], rounds).map((r) => r.key)).toEqual(["b", "a", "d", "c"]);
    expect(
      standings(
        ["x", "y"],
        [
          { x: e(1), y: e(4) },
          { x: e(4), y: e(1) },
        ],
      ).map((r) => r.key),
    ).toEqual(["y", "x"]);
  });

  it("감점은 총점에서 뺀다", () => {
    const [top] = standings(["a", "b"], [{ a: e(1, 0, 4), b: e(2) }]);
    expect(top).toMatchObject({ key: "b", total: 7 });
  });

  it("확률 합은 진출 팀 수와 같고 같은 입력에는 같은 값을 낸다", () => {
    const pool: KillPool = Array.from({ length: 8 }, (_, p) => [(8 - p) / 2]);
    const rows = standings(TEAMS, [order(TEAMS)]);
    const a = advanceOdds(rows, 5, 4, pool, 3000, 1);
    expect([...a.values()].reduce((x, y) => x + y, 0)).toBeCloseTo(4);
    expect([...advanceOdds(rows, 5, 4, pool, 3000, 1)]).toEqual([...a]);
    expect(a.get("a")!).toBeGreaterThan(a.get("h")!);
  });

  it("남은 라운드에 따라잡을 수 없으면 진출 확정, 넘어설 수 없으면 탈락 확정이다", () => {
    const rows = [100, 90, 80, 70, 10, 5, 3, 0].map((total, i) => ({ key: TEAMS[i], total, killScore: 0, penalty: 0, last: i + 1, places: [] }) as Row);
    const s = certainty(rows, 1, 4, 20);
    expect(TEAMS.map((k) => s.get(k) ?? null)).toEqual(["in", "in", "in", "in", "out", "out", "out", "out"]);
    expect(certainty(rows, 3, 4, 20).get("a")).toBeUndefined();
  });

  it("결승은 5라운드부터 체크포인트를 주고, 체크포인트 팀이 1위를 하면 끝난다", () => {
    const four = [1, 2, 3, 4].map(() => order(TEAMS));
    const before = finalState(TEAMS, four);
    expect(before.next).toMatchObject({ roundNo: 5, checkpoint: ["a", "b"], weather: "a" });
    const r5 = order(["h", "a", "b", "c", "d", "e", "f", "g"]);
    const after5 = finalState(TEAMS, [...four, r5]);
    expect(after5.champion).toBeNull();
    expect(after5.next?.checkpoint).toHaveLength(3);
    const done = finalState(TEAMS, [...four, r5, order(TEAMS)]);
    expect(done.champion).toEqual({ key: "a", round: 6 });
    expect(done.rows[0].key).toBe("a");
    expect(done.next).toBeNull();
  });

  it("체크포인트 팀은 규정 감점으로 순위가 내려가도 체크포인트를 유지하고, 게임 안 감점이면 잃는다", () => {
    const four = [1, 2, 3, 4].map(() => order(TEAMS));
    const after = (cut: Partial<Entry>) => finalState(TEAMS, [...four, order(["d", "c", "b", "a", "e", "f", "g", "h"], { b: cut })]).next?.checkpoint.sort();
    expect(after({ rule: 8 })).toEqual(["a", "b", "c", "d"]);
    expect(after({ penalty: 8 })).toEqual(["a", "c", "d"]);
  });
});

describe("KEL 자료", () => {
  it("자료 폴더가 없으면 null을 돌려준다", () => {
    expect(kelData()).toBeNull();
  });

  it("CSV를 읽어 팀 경기와 계산기 자료를 만든다", () => {
    kelFixture(process.env.DATA_DIR!);
    const data = kelData()!;
    expect(data.games).toHaveLength(36 * 8);
    expect(new Set(data.rows.map((r) => r.character))).toEqual(new Set(["Nadine", "Alonso", "DebiMarlene", "LiDailin", "Niah", "YuMin", "Jackie", "Aya", "Eleven"]));
    const calc = kelCalcData(data);
    expect(calc.pool.map((l) => l.length)).toEqual(Array(8).fill(36));
    expect(calc.teamGames).toBe(288);
    expect(calc.demo?.teams).toHaveLength(8);
    expect(calc.demo?.rounds[0]["gj-slasher"].penalty).toBe(1);
  });
});
