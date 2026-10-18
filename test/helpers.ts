import { parseRoundCsv, type Player } from "../src/lib/parse";
import type { RoundInput } from "../src/lib/engine";

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
