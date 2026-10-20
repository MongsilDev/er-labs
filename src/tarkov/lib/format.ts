const KST = "Asia/Seoul";

export const int = (n: number | null | undefined) => (n == null ? "-" : Math.round(n).toLocaleString("en-US"));

export const dec = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "-" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? "-" : `${dec(n * 100, d)}%`);

export const hours = (seconds: number | null | undefined) => (seconds == null ? "-" : `${int(seconds / 3600)}시간`);

const dt = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// 기본 ko-KR 표기는 "2026. 10. 19."라 표에서 길어져 "2026.10.19 17:58"로 맞춤
function parts(ms: number) {
  const o: Record<string, string> = {};
  for (const p of dt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return o;
}

export const dateTime = (ms: number | null | undefined) => {
  if (!ms) return "-";
  const o = parts(ms);
  return `${o.year}.${o.month}.${o.day} ${o.hour}:${o.minute}`;
};
export const date = (ms: number | null | undefined) => {
  if (!ms) return "-";
  const o = parts(ms);
  return `${o.year}.${o.month}.${o.day}`;
};

export const ago = (ms: number, now = Date.now()) => {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  return m < 60 ? `${m}분 전` : m < 48 * 60 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`;
};

export const div = (a: number | null | undefined, b: number | null | undefined): number | null =>
  a == null || b == null ? null : b > 0 ? a / b : null;
