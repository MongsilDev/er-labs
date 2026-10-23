import { FINAL_ROUNDS } from "./kel";
import { CHECKPOINT_SEQUENCE, PLACEMENT_POINTS, defaultMainWeather } from "./rules";

// penalty는 처치한 선수가 없는 탈락처럼 게임 안에서 생긴 감점, rule은 지각처럼 라운드 사이에 받은 규정 감점
export type Entry = { placement: number; killScore: number; penalty: number; rule?: number };
export type Round = Record<string, Entry>;
type Row = { key: string; total: number; killScore: number; penalty: number; last: number | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

export const placementPoints = (placement: number) => PLACEMENT_POINTS[placement - 1] ?? 0;
export const gameScore = (e: Entry) => placementPoints(e.placement) + e.killScore;

export function tally(teams: string[], rounds: Round[]): Row[] {
  return teams.map((key) => {
    let total = 0;
    let killScore = 0;
    let penalty = 0;
    let last: number | null = null;
    for (const round of rounds) {
      const e = round[key];
      if (!e) continue;
      const cut = e.penalty + (e.rule ?? 0);
      total += gameScore(e) - cut;
      killScore += e.killScore;
      penalty += cut;
      last = e.placement;
    }
    return { key, total: r2(total), killScore: r2(killScore), penalty: r2(penalty), last };
  });
}

// 규정집 제9조는 킬 수로 적었지만 공식 순위표는 킬 점수로 동점을 가름(서킷 1 결승, 서킷 3 A조)
export const compareRows = (a: Pick<Row, "total" | "killScore" | "last">, b: Pick<Row, "total" | "killScore" | "last">) =>
  b.total - a.total || b.killScore - a.killScore || (a.last ?? 99) - (b.last ?? 99);

export const standings = (teams: string[], rounds: Round[]) => tally(teams, rounds).sort(compareRows);

export type FinalState = {
  rows: (Row & { checkpoint: boolean })[];
  champion: { key: string; round: number } | null;
  played: number;
  holders: string[][];
  next: { roundNo: number; checkpoint: string[]; weather: string | null; main: string } | null;
};

// 엔진 computeGroup은 선수 단위 입력을 받고 동점이면 킬 수와 이름까지 비교해서 따로 둠
export function finalState(teams: string[], rounds: Round[]): FinalState {
  const played = Math.min(rounds.length, FINAL_ROUNDS);
  let status = new Set<string>();
  let champion: FinalState["champion"] = null;
  const holders: string[][] = [];
  for (let r = 1; r <= Math.min(played + 1, FINAL_ROUNDS); r++) {
    const done = rounds.slice(0, r - 1);
    const n = Math.min(CHECKPOINT_SEQUENCE[r - 1] ?? teams.length, teams.length);
    const next = new Set(
      standings(teams, done)
        .slice(0, n)
        .map((x) => x.key),
    );
    // 9월 7일 개정 공지: 체크포인트를 받은 팀은 라운드 사이 규정 감점으로 순위가 내려가도 유지
    if (n > 0 && r > 1) {
      const pen = rounds[r - 2];
      const free = tally(teams, done)
        .map((x) => ({ ...x, total: x.total + (pen[x.key]?.rule ?? 0) }))
        .sort(compareRows)
        .slice(0, n);
      for (const x of free) if (status.has(x.key)) next.add(x.key);
    }
    status = next;
    if (r > played) break;
    holders.push([...status]);
    const winner = Object.keys(rounds[r - 1]).find((k) => rounds[r - 1][k].placement === 1);
    if (winner && status.has(winner)) {
      champion = { key: winner, round: r };
      break;
    }
  }
  const counted = champion ? champion.round : played;
  const sorted = standings(teams, rounds.slice(0, counted));
  if (champion)
    sorted.unshift(
      ...sorted.splice(
        sorted.findIndex((x) => x.key === champion.key),
        1,
      ),
    );
  const ended = Boolean(champion) || played >= FINAL_ROUNDS;
  const rows = sorted.map((x) => ({ ...x, checkpoint: !ended && status.has(x.key) }));
  const roundNo = counted + 1;
  return {
    rows,
    champion,
    played: counted,
    holders,
    next: ended
      ? null
      : { roundNo, checkpoint: rows.filter((x) => x.checkpoint).map((x) => x.key), weather: rows.find((x) => x.checkpoint)?.key ?? null, main: defaultMainWeather(roundNo) },
  };
}
