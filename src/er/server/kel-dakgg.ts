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
  // 빌드는 이름표로 바꾼 이름, 이름표가 없으면 빈 문자열
  weapon: string;
  tactical: string;
  trait: string;
  traitGroup: string;
  // 무기, 옷, 머리, 팔, 다리 순서
  gear: string[];
  // 1~6레벨에 찍은 스킬 칸, 예: "E Q W E T R"
  order: string;
  // 스킬 칸 이름, 같은 실험체 기록이 한 객체를 같이 씀
  skills: Partial<Record<SkillSlot, string>>;
  // 사망 기록 첫 칸의 처치 실험체(dak.gg 영문 key)와 마지막 일격 기술
  death: { character: string; cause: string } | null;
};

export type SkillSlot = "Q" | "W" | "E" | "R" | "T";
export const SKILL_SLOTS: SkillSlot[] = ["Q", "W", "E", "R", "T"];

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
  userNum?: number;
  bestWeapon?: number;
  equipment?: Record<string, number>;
  tacticalSkillGroup?: number;
  traitFirstCore?: number;
  killer?: string;
  killerCharacter?: string;
  causeOfDeath?: string;
};

type Labels = {
  names: Map<string, string>;
  weapons: Map<number, string>;
  items: Map<number, string>;
  tactical: Map<number, string>;
  traits: Map<number, { name: string; group: string }>;
  skills: Map<number, Partial<Record<SkillSlot, string>>>;
};

const GAMES = "dakgg/games";
const CHARACTERS = "dakgg/d_characters.json";
const AREAS = "dakgg/d_areas.json";
const WEATHERS = "dakgg/d_weathers.json";
const LABELS = ["d_masteries", "d_items", "d_tactical-skills", "d_trait-skills", "d_skills"].map((f) => `dakgg/${f}.json`);

const games = (dir: string) =>
  readdirSync(join(dir, GAMES))
    .filter((f) => f.endsWith(".json"))
    .sort();

// kelData 서명에 넣는 경로, 폴더를 읽지 못하면 이름표만 넣고 오류는 readDak에서 남김
export function dakFiles(dir: string): string[] {
  try {
    return [CHARACTERS, AREAS, WEATHERS, ...LABELS, ...games(dir).map((f) => `${GAMES}/${f}`)];
  } catch {
    return [CHARACTERS, AREAS, WEATHERS, ...LABELS];
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

// 빌드 이름표는 따로 읽어, 하나가 없어도 그 이름만 비고 나머지 값은 남음
function readLabel<T>(dir: string, file: string, read: (json: Record<string, unknown>) => [number, T][]): Map<number, T> {
  try {
    return new Map(read(JSON.parse(readFileSync(join(dir, file), "utf8"))));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") console.error(`[kel] dak.gg ${file}를 읽지 못함`, e);
    return new Map();
  }
}

const counts = (json?: string): Record<string, number> => {
  try {
    const v: unknown = json ? JSON.parse(json) : null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isFinite(e[1])));
  } catch {
    return {};
  }
};

type Named = { id: number; name: string };

// 한 칸에 스킬이 여럿인 실험체는 번호가 가장 작은 스킬 이름을 씀
function skillNames(list: (Named & { characterId?: number; slot?: string })[]) {
  const map = new Map<number, Partial<Record<SkillSlot, string>>>();
  for (const s of [...list].sort((a, b) => a.id - b.id)) {
    if (s.characterId === undefined || !SKILL_SLOTS.includes(s.slot as SkillSlot)) continue;
    const names = map.get(s.characterId) ?? {};
    names[s.slot as SkillSlot] ??= s.name;
    map.set(s.characterId, names);
  }
  return [...map];
}

function labels(dir: string): Omit<Labels, "names"> {
  const [weapons, items, tactical, traits, skills] = LABELS;
  const named = (k: string) => (j: Record<string, unknown>) => (j[k] as Named[]).map((x): [number, string] => [x.id, x.name]);
  return {
    weapons: readLabel(dir, weapons, named("masteries")),
    items: readLabel(dir, items, named("items")),
    tactical: readLabel(dir, tactical, named("tacticalSkills")),
    traits: readLabel(dir, traits, (j) => {
      const groups = new Map((j.traitSkillGroups as { key: string; name: string }[]).map((g) => [g.key, g.name]));
      return (j.traitSkills as (Named & { group: string })[]).map((t) => [t.id, { name: t.name, group: groups.get(t.group) ?? "" }]);
    }),
    skills: readLabel(dir, skills, (j) => skillNames(j.skills as Named[])),
  };
}

const GEAR_SLOTS = 5;
const NO_SKILLS = {};

// 스킬은 '아르다 Q - 샤마쉬의 두루마리'처럼 처치 실험체 이름이 앞에 붙기도 하고, '다람쥐 덫_2'처럼 단계 번호가 뒤에 붙기도 함
function cause(text: string, killer: string, l: Labels): string {
  if (text === "basicAttack") return "기본 공격";
  const name = l.names.get(killer);
  return (name && text.startsWith(`${name} `) ? text.slice(name.length + 1) : text).replace(/_\d+$/, "");
}

// protectAbsorb는 자기 몸의 보호막이 막은 피해라 팀원 회복에 넣지 않음
const pick = (p: Player, l: Labels, order: string[], areas: Map<string, string>, weathers: Map<string, string>): KelDak => {
  const name = (map: Map<number, string>, id?: number) => (id === undefined ? "" : (map.get(id) ?? ""));
  const trait = p.traitFirstCore === undefined ? undefined : l.traits.get(p.traitFirstCore);
  return {
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
    weapon: name(l.weapons, p.bestWeapon),
    tactical: name(l.tactical, p.tacticalSkillGroup),
    trait: trait?.name ?? "",
    traitGroup: trait?.group ?? "",
    gear: Array.from({ length: GEAR_SLOTS }, (_, i) => name(l.items, p.equipment?.[i])),
    order: order.slice(0, 6).join(" "),
    skills: l.skills.get(p.characterNum) ?? NO_SKILLS,
    death: p.killer === "player" && p.killerCharacter && p.causeOfDeath ? { character: p.killerCharacter, cause: cause(p.causeOfDeath, p.killerCharacter, l) } : null,
  };
};

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
  let characterNames: Map<string, string>;
  try {
    const list = JSON.parse(readFileSync(join(dir, CHARACTERS), "utf8")).characters as { id: number; key: string; name?: string }[];
    keys = new Map(list.map((c) => [c.id, c.key]));
    characterNames = new Map(list.map((c) => [c.key, c.name ?? ""]));
  } catch (e) {
    console.error("[kel] dak.gg 실험체 이름표를 읽지 못함", e);
    return [];
  }
  const areas = names(dir, AREAS, "areas", "id");
  const weathers = names(dir, WEATHERS, "weathers", "key");
  const l = { ...labels(dir), names: characterNames };
  return files.flatMap((f) => {
    try {
      const game: { games: Player[]; skillInfos?: { userNum: number; orders?: string[] }[] } = JSON.parse(readFileSync(join(dir, GAMES, f), "utf8"));
      const orders = new Map((game.skillInfos ?? []).map((s) => [s.userNum, s.orders ?? []]));
      return game.games.map((p) => ({ gameId: p.gameId, rank: p.gameRank, character: keys.get(p.characterNum) ?? "", dak: pick(p, l, orders.get(p.userNum ?? -1) ?? [], areas, weathers) }));
    } catch (e) {
      console.error(`[kel] dak.gg ${f}를 읽지 못함`, e);
      return [];
    }
  });
}
