export function ticks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo || 1) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const first = Math.floor(lo / step);
  const last = Math.max(first, Math.ceil(hi / step - 1e-9));
  return Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toPrecision(12)));
}
