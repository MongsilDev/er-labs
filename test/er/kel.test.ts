import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { championshipTeams, KEL_TEAMS, seasonStandings } from "../../src/er/lib/kel";
import { finalState, standings, type Entry, type Round } from "../../src/er/lib/kel-calc";
import { kelData, stageRounds } from "../../src/er/server/kel";
import { kelOdds } from "../../src/er/server/kel-odds";
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

describe("KEL 점수와 체크포인트", () => {
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

  it("CSV를 읽어 팀 경기를 만들고 결과 표와 다른 점수는 감점으로 넣는다", () => {
    kelFixture(process.env.DATA_DIR!);
    const data = kelData()!;
    expect(data.games).toHaveLength(76 * 8);
    expect(new Set(data.rows.map((r) => r.character))).toEqual(new Set(["Nadine", "Alonso", "DebiMarlene", "LiDailin", "Niah", "YuMin", "Jackie", "Aya", "Eleven"]));
    const final = stageRounds(data, "c4", "결승");
    expect(final.teams).toHaveLength(8);
    expect(final.rounds[2]["new-rise-gangwon"].penalty).toBe(1);
  });
});

// 시점마다 10만 번 시뮬레이션해서 기본 5초 제한으로는 모자랄 수 있음
describe("KEL 진출 확률", { timeout: 30_000 }, () => {
  beforeAll(() => kelFixture(process.env.DATA_DIR!));

  it("단계마다 결승 직행, 준결승, 탈락 확률을 내고, 확정과 불가능 표시는 확률과 어긋나지 않으며, 처지가 같은 팀은 확률이 같다", async () => {
    const odds = (await kelOdds(kelData()!))!;
    expect(odds.views).toHaveLength(24);
    for (const v of odds.views) {
      [4, 8, 4].forEach((n, b) => expect(v.teams.reduce((s, o) => s + o.p[b], 0)).toBeCloseTo(n, 9));
      for (const o of v.teams)
        o.p.forEach((p, b) => {
          if (o.sure[b]) expect(p).toBe(1);
          if (o.never[b]) expect(p).toBe(0);
        });
    }
    const upper = odds.input.brackets[0]["승자조"];
    const early = odds.views.find((v) => v.circuit === 1 && v.done === 2)!;
    expect(new Set(upper.map((t) => early.teams[t].p.join()))).toHaveLength(1);
    const end = odds.views.find((v) => v.circuit === 4 && v.done === 6)!;
    expect(KEL_TEAMS.filter((_, t) => end.teams[t].sure[0]).map((t) => t.name).sort()).toEqual(championshipTeams().seeds.map((t) => t.name).sort());
  });

  it("서킷 4 결승만 남은 시점에는 순위 하나로 갈리는 조건을 문장으로 만든다", async () => {
    const odds = (await kelOdds(kelData()!))!;
    const lines = Object.fromEntries([...odds.cases].map(([t, l]) => [KEL_TEAMS[t].name, l]));
    expect(lines["경북 어센더스"]).toEqual(["서킷 4 결승에서 3위 안에 들면 결승 직행이 확정됩니다."]);
    expect(lines["양주 웨일즈"]).toEqual(["서킷 4 결승에서 1위를 하지 못하면 결승에 바로 갈 수 없습니다.", "4위 안에 들면 챔피언십 진출이 확정됩니다.", "5위 안에 들지 못하면 탈락합니다."]);
    expect(lines["경기 이네이트"]).toEqual(["FN 세종이 서킷 4 결승 6위 안에, 양주 웨일즈가 4위 안에 함께 들면 탈락합니다."]);
  });

  it("서킷 단계별 경기 기록이 빠지면 계산하지 않는다", async () => {
    rmSync(join(process.env.DATA_DIR!, "kel", "2026_KEL_CIRCUIT_2_Lower_Finals_2026-07-11.csv"));
    expect(await kelOdds(kelData()!)).toBeNull();
  });
});
