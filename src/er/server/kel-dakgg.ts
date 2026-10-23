import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// dak.gg 경기 상세에서 화면에 쓰는 값만 남김
export type KelDak = {
  cc: number;
  heal: number;
  camera: number;
  vision: number;
  wickline: boolean;
  time: number;
  // 지역과 날씨는 한국어 이름, 이름표에 없으면 빈 문자열
  start: string;
  deathPlaces: string[];
  escaped: boolean;
  weather: string;
  cameraOff: number;
  revive: number;
  // 킬과 데스는 상대 실험체 번호별 횟수
  num: number;
  killed: Record<string, number>;
  killedBy: Record<string, number>;
};

type Player = {
  gameId: number;
  gameRank: number;
  characterNum: number;
  ccTimeToPlayer?: number;
  teamRecover?: number;
  addTelephotoCamera?: number;
  removeTelephotoCamera?: number;
  viewContribution?: number;
  creditRevivedOthersCount?: number;
  playTime?: number;
  killWicklineGainVFCredit?: number;
  placeOfStart?: string;
  placeOfDeath?: string;
  placeOfDeath2?: string;
  placeOfDeath3?: string;
  escapeState?: number;
  mainWeather?: number;
  killDetails?: string;
  deathDetails?: string;
};

const GAMES = "dakgg/games";
const CHARACTERS = "dakgg/d_characters.json";
const AREAS = "dakgg/d_areas.json";
const WEATHERS = "dakgg/d_weathers.json";

const games = (dir: string) =>
  readdirSync(join(dir, GAMES))
    .filter((f) => f.endsWith(".json"))
    .sort();

// kelData 서명에 넣는 경로, 폴더를 읽지 못하면 이름표만 넣고 오류는 readDak에서 남김
export function dakFiles(dir: string): string[] {
  try {
    return [CHARACTERS, AREAS, WEATHERS, ...games(dir).map((f) => `${GAMES}/${f}`)];
  } catch {
    return [CHARACTERS, AREAS, WEATHERS];
  }
}

// 지역과 날씨 이름표는 읽지 못해도 그 값만 비우고 나머지는 씀
function names(dir: string, file: string, list: string, id: string): Map<string, string> {
  try {
    const rows: Record<string, unknown>[] = JSON.parse(readFileSync(join(dir, file), "utf8"))[list];
    return new Map(rows.map((x) => [String(x[id]), String(x.name)]));
  } catch (e) {
    console.error(`[kel] dak.gg ${file}를 읽지 못함`, e);
    return new Map();
  }
}

const counts = (json?: string): Record<string, number> => {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
};

// protectAbsorb는 자기 몸의 보호막이 막은 피해라 팀원 회복에 넣지 않음
const pick = (p: Player, areas: Map<string, string>, weathers: Map<string, string>): KelDak => ({
  cc: p.ccTimeToPlayer ?? 0,
  heal: p.teamRecover ?? 0,
  camera: p.addTelephotoCamera ?? 0,
  cameraOff: p.removeTelephotoCamera ?? 0,
  vision: p.viewContribution ?? 0,
  revive: p.creditRevivedOthersCount ?? 0,
  time: p.playTime ?? 0,
  wickline: (p.killWicklineGainVFCredit ?? 0) > 0,
  start: areas.get(String(p.placeOfStart)) ?? "",
  // 사망 장소는 선수마다 세 칸까지만 남음
  deathPlaces: [p.placeOfDeath, p.placeOfDeath2, p.placeOfDeath3].flatMap((c) => areas.get(String(c)) ?? []),
  escaped: p.escapeState === 3,
  weather: weathers.get(String(p.mainWeather)) ?? "",
  num: p.characterNum,
  killed: counts(p.killDetails),
  killedBy: counts(p.deathDetails),
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
  const areas = names(dir, AREAS, "areas", "id");
  const weathers = names(dir, WEATHERS, "weathers", "key");
  return files.flatMap((f) => {
    try {
      const players: Player[] = JSON.parse(readFileSync(join(dir, GAMES, f), "utf8")).games;
      return players.map((p) => ({ gameId: p.gameId, rank: p.gameRank, character: keys.get(p.characterNum) ?? "", dak: pick(p, areas, weathers) }));
    } catch (e) {
      console.error(`[kel] dak.gg ${f}를 읽지 못함`, e);
      return [];
    }
  });
}
