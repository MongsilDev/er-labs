const KST = "Asia/Seoul";

export const int = (n: number | null | undefined) => (n == null ? "-" : Math.round(n).toLocaleString("en-US"));

export const dec = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "-" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const pct = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? "-" : `${dec(n * 100, d)}%`);

export const hours = (seconds: number | null | undefined) => (seconds == null ? "-" : `${int(seconds / 3600)}시간`);

const dt = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
const d = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" });

export const dateTime = (ms: number | null | undefined) => (ms ? dt.format(new Date(ms)) : "-");
export const date = (ms: number | null | undefined) => (ms ? d.format(new Date(ms)) : "-");

export const div = (a: number | null | undefined, b: number | null | undefined): number | null =>
  a == null || b == null ? null : b > 0 ? a / b : null;
