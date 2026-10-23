import "server-only";
import { KEL_TEAMS, QUALIFY, SEEDS, seasonStandings, type SeasonRow } from "@/er/lib/kel";
import type { Odds } from "./kel-odds";

// 결승 직행, 준결승. sure는 그 결과가 확정됐는지, p는 그 결과가 나올 확률이고 진출 확률 계산이 없으면 null
export type RaceRow = SeasonRow & { sure: boolean; p: number | null };
export type RaceGroup = { stage: "결승 직행" | "준결승"; day: string; rows: RaceRow[] };

export const SEMI_DAY = "2026-11-07";
export const FINAL_DAY = "2026-11-08";

// 시즌 순위 1~12위를 둘로 나누고, 서버 시작 때 계산해 둔 진출 확률의 마지막 시점으로 확정 여부를 붙임
export function race(odds: Odds | null): RaceGroup[] {
  const last = odds?.views.at(-1);
  const rows = seasonStandings()
    .slice(0, QUALIFY)
    .map((row): RaceRow => {
      const b = row.rank <= SEEDS ? 0 : 1;
      const o = last?.teams[KEL_TEAMS.indexOf(row.team)];
      return { ...row, sure: o?.sure[b] ?? false, p: o ? o.p[b] : null };
    });
  return [
    { stage: "결승 직행", day: FINAL_DAY, rows: rows.slice(0, SEEDS) },
    { stage: "준결승", day: SEMI_DAY, rows: rows.slice(SEEDS) },
  ];
}

const seoulDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

// 서울 날짜로 day까지 남은 날 수. 지난 날이면 음수
export function daysUntil(day: string, now: number): number {
  const utc = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(day) - utc(seoulDay.format(now))) / 864e5);
}

// 지난 경기는 남은 날을 쓰지 않음
export function dday(day: string, now: number): string | null {
  const n = daysUntil(day, now);
  return n > 0 ? `D-${n}` : n === 0 ? "오늘" : null;
}

// 결승 직행, 준결승 순서로 race와 맞춤
export const raceDays = (now = Date.now()) => [dday(FINAL_DAY, now), dday(SEMI_DAY, now)];
