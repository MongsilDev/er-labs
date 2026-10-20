import season from "@/tarkov/data/season.json";

export type Perk = { id: string; name: string; en: string; effects: string[]; points?: number; exclusive?: string[] };

export const COMMON = season.common as Perk[];
export const PERSONAL = season.personal as Perk[];
export const PERK = new Map(PERSONAL.map((p) => [p.id, p]));

// 주소에는 선택 여부를 비트로 묶어 36진수로 넣음. id 앞부분이 생성 시각이라 새 특성은 뒤 비트에 배정됨, 53개까지
const ORDER = PERSONAL.map((p) => p.id).sort();

export const encodeBuild = (sel: Iterable<string>) => {
  const set = new Set(sel);
  return ORDER.reduce((n, id, i) => (set.has(id) ? n + 2 ** i : n), 0).toString(36);
};

export function decodeBuild(raw: string) {
  const v = /^[0-9a-z]{1,11}$/.test(raw) ? parseInt(raw, 36) : 0;
  const n = Number.isSafeInteger(v) ? v : 0;
  return ORDER.filter((_, i) => Math.floor(n / 2 ** i) % 2 === 1);
}
