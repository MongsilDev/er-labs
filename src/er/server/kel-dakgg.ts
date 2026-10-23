import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// dak.gg 경기 상세에서 화면에 쓰는 값만 남김
export type KelDak = { cc: number; heal: number; camera: number; vision: number; wickline: boolean };

type Player = {
  gameId: number;
  gameRank: number;
  characterNum: number;
  ccTimeToPlayer?: number;
  teamRecover?: number;
  addTelephotoCamera?: number;
  viewContribution?: number;
  killWicklineGainVFCredit?: number;
};

const GAMES = "dakgg/games";
const CHARACTERS = "dakgg/d_characters.json";

const games = (dir: string) =>
  readdirSync(join(dir, GAMES))
    .filter((f) => f.endsWith(".json"))
    .sort();

// kelData 서명에 넣는 경로, 폴더를 읽지 못하면 이름표만 넣고 오류는 readDak에서 남김
export function dakFiles(dir: string): string[] {
  try {
    return [CHARACTERS, ...games(dir).map((f) => `${GAMES}/${f}`)];
  } catch {
    return [CHARACTERS];
  }
}

// protectAbsorb는 자기 몸의 보호막이 막은 피해라 팀원 회복에 넣지 않음
const pick = (p: Player): KelDak => ({
  cc: p.ccTimeToPlayer ?? 0,
  heal: p.teamRecover ?? 0,
  camera: p.addTelephotoCamera ?? 0,
  vision: p.viewContribution ?? 0,
  wickline: (p.killWicklineGainVFCredit ?? 0) > 0,
});

// character는 dak.gg 이름표의 영문 key
export function readDak(dir: string): { gameId: number; rank: number; character: string; dak: KelDak }[] {
  let files: string[];
  try {
    files = games(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error("[kel] dak.gg 경기 상세 폴더를 읽지 못함", e);
    return [];
  }
  let keys: Map<number, string>;
  try {
    const list = JSON.parse(readFileSync(join(dir, CHARACTERS), "utf8")).characters as { id: number; key: string }[];
    keys = new Map(list.map((c) => [c.id, c.key]));
  } catch (e) {
    console.error("[kel] dak.gg 실험체 이름표를 읽지 못함", e);
    return [];
  }
  return files.flatMap((f) => {
    try {
      const players: Player[] = JSON.parse(readFileSync(join(dir, GAMES, f), "utf8")).games;
      return players.map((p) => ({ gameId: p.gameId, rank: p.gameRank, character: keys.get(p.characterNum) ?? "", dak: pick(p) }));
    } catch (e) {
      console.error(`[kel] dak.gg ${f}를 읽지 못함`, e);
      return [];
    }
  });
}
