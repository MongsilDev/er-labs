import characters from "@/data/characters.json";

const KO = characters as Record<string, string>;

export const fmt = (v: number) => (Number.isInteger(v) ? String(v) : (Math.round(v * 100) / 100).toString());
export const fmt1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

export function characterName(english: string): string {
  return KO[english] ?? KO[english.replace(/\s+/g, "")] ?? english;
}

export function remaining(expiresAt: number, at = Date.now()): string {
  const ms = expiresAt - at;
  if (ms <= 0) return "곧 삭제";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h}시간 뒤 삭제`;
  return `${Math.max(1, Math.ceil(ms / 60_000))}분 뒤 삭제`;
}

export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "방금";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(at);
}

export const dateKo = (at: number) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "Asia/Seoul" }).format(at);
export const timeKo = (at: number) =>
  new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(at);

export function rampColor(i: number, n: number): string {
  const p = n <= 1 ? 100 : Math.round((i / (n - 1)) * 100);
  return `color-mix(in srgb, var(--ramp-b) ${p}%, var(--ramp-a))`;
}

export const rampHigh = (i: number, n: number) => (n <= 1 ? true : i / (n - 1) >= 0.5);

export const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
