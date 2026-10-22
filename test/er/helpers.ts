import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseRoundCsv, type Player } from "../../src/er/lib/parse";
import type { RoundInput } from "../../src/er/lib/engine";
import { KEL_TEAMS } from "../../src/er/lib/kel";

export const HEADER =
  "rank, level, character, nickname, weapon, best weapon mastery, best weapon mastery level, total field kill, team kill, elimination, down can not eliminate, repeat down can not eliminate, down can eliminate, repeat down can eliminate, kill, assist, hunting, killer, gameId, teamName, tournament total score, tournament rank score, tournament kill score";

const RS = [10, 7, 5, 4, 3, 2, 1, 0];

type PlayerSpec = { nick: string; char?: string; kill?: number; hunting?: number; level?: number };

export type TeamSpec = {
  team: string;
  place: number;
  ks: number;
  kills?: number;
  players?: PlayerSpec[];
};

export function csv(gameId: number, teams: TeamSpec[]): string {
  const lines = [HEADER];
  for (const t of teams) {
    const players: PlayerSpec[] = t.players ?? [1, 2, 3].map((i) => ({ nick: `${t.team}-${i}`, char: `${t.team}${i}` }));
    for (const p of players) {
      const total = (RS[t.place - 1] ?? 0) + t.ks;
      lines.push(
        [
          t.place, p.level ?? 18, p.char ?? `${p.nick}-char`, p.nick, "", "Defense", 18, t.kills ?? 0, t.kills ?? 0, 0, 0, 0, 0, 0,
          p.kill ?? 0, 0, p.hunting ?? 40, "", gameId, t.team, total, RS[t.place - 1] ?? 0, t.ks,
        ].join(", "),
      );
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function round(roundNo: number, gameId: number, teams: TeamSpec[]): RoundInput {
  const parsed = parseRoundCsv(csv(gameId, teams));
  if (!parsed.ok) throw new Error(parsed.error);
  return { roundNo, source: "csv", gameId, players: parsed.round.players };
}

export function places(roundNo: number, order: string[], ks: number[] = []): RoundInput {
  return round(
    roundNo,
    1000 + roundNo,
    order.map((team, i) => ({ team, place: i + 1, ks: ks[i] ?? 0 })),
  );
}

export type { Player };

const KEL_HEADER = "매치,날짜,라운드,gameId,순위,팀,선수,실험체,킬,어시,데스,채집,가한피해,받은피해,rankScore,killScore,TS,크레딧,KPR";
const KEL_CHARS = ["Nadine", "Alonso", "Debi & Marlene", "Li Dailin", "NiaH", "Yumin", "Jackie", "Aya", "Eleven"];

// 실제 경기 기록 대신 지어낸 값으로 KEL CSV를 만듦
export function kelFixture(dataDir: string) {
  const dir = join(dataDir, "kel");
  mkdirSync(dir, { recursive: true });
  const all = KEL_TEAMS.map((t) => t.csv);
  const files: [string, string[], number][] = [
    ["2026_KEL_Opening_week_Group_Alpha_2026-05-22.csv", all.slice(0, 8), 4],
    ["2026_KEL_CIRCUIT_4_Finals_2026-10-18.csv", all.slice(4, 12), 6],
    ["2026_KEL_MIDSEASON_CUP_SEMIFINALS_2026-08-01.csv", all.slice(8, 16), 6],
  ];
  files.forEach(([name, teams, rounds], f) => {
    const date = name.slice(-14, -4);
    const lines = [KEL_HEADER];
    for (let r = 1; r <= rounds; r++) {
      teams.forEach((team, i) => {
        const place = ((i + r * 3) % teams.length) + 1;
        const ks = ((r + i) % 5) * 1.5;
        for (let p = 0; p < 3; p++) {
          lines.push(
            [
              name.slice(0, -15).replace(/_/g, " "), date, r, 10_000 + f * 100 + r, place, team, `T${i}_선수${f}${i}${p}`, KEL_CHARS[(i * 3 + p + r) % KEL_CHARS.length],
              (r + i + p) % 4, (i + p) % 6, p % 2, 30 + i, 9000 + i * 700 + p * 300 + r * 50, 7000 + p * 900 + i * 100, RS[place - 1], ks, RS[place - 1] + ks, 1500 + i, (1 + ((i + p) % 3) / 2).toFixed(3),
            ].join(","),
          );
        }
      });
    }
    writeFileSync(join(dir, name), "\ufeff" + lines.join("\n") + "\n");
  });
}
