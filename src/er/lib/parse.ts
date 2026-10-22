import { parseCsv } from "./csv";
import { cleanName } from "./text";

export type Player = {
  nickname: string;
  character: string;
  team: string;
  placement: number | null;
  totalScore: number;
  killScore: number;
  kills: number;
  teamKills: number;
  hunting: number;
  level: number;
};

export type ParsedRound = { gameId: number; players: Player[] };
export type ParseResult = { ok: true; round: ParsedRound } | { ok: false; error: string };

const REQUIRED = ["teamName", "tournament total score", "tournament kill score", "gameId"] as const;

function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseRoundCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "경기 기록이 없는 파일입니다." };

  const header = rows[0].map((h) => h.trim());
  const index = new Map(header.map((h, i) => [h, i]));
  const missing = REQUIRED.filter((name) => !index.has(name));
  if (missing.length > 0) {
    return { ok: false, error: `이터널 리턴 결과 CSV가 아닙니다. 없는 열: ${missing.join(", ")}` };
  }

  const at = (r: string[], name: string) => {
    const i = index.get(name);
    return i === undefined ? "" : (r[i] ?? "").trim();
  };

  const gameId = Number.parseInt(at(rows[1], "gameId"), 10);
  if (!Number.isFinite(gameId)) return { ok: false, error: "gameId를 읽을 수 없습니다. 게임에서 내보낸 CSV를 고치지 않고 올려주세요." };

  const players: Player[] = [];
  for (const r of rows.slice(1)) {
    const team = cleanName(at(r, "teamName"));
    if (!team) continue;
    const placement = Number.parseInt(at(r, "rank"), 10);
    players.push({
      nickname: cleanName(at(r, "nickname")),
      character: cleanName(at(r, "character")),
      team,
      placement: Number.isFinite(placement) && placement > 0 ? placement : null,
      totalScore: num(at(r, "tournament total score")),
      killScore: num(at(r, "tournament kill score")),
      kills: num(at(r, "kill")),
      teamKills: num(at(r, "team kill")),
      hunting: num(at(r, "hunting")),
      level: num(at(r, "level")),
    });
  }
  if (players.length === 0) return { ok: false, error: "경기 기록이 없는 파일입니다." };
  if (new Set(players.map((p) => p.team)).size > 24) {
    return { ok: false, error: "한 경기의 팀 수가 24팀을 넘습니다." };
  }
  return { ok: true, round: { gameId, players } };
}
