import "server-only";

type Bucket = { count: number; reset: number };
const g = globalThis as unknown as { __tlLimits?: Map<string, Bucket> };
const buckets = (g.__tlLimits ??= new Map());

export function allow(key: string, max: number, windowMs: number): boolean {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= t) {
    buckets.set(key, { count: 1, reset: t + windowMs });
    if (buckets.size > 50_000) {
      for (const [k, v] of buckets) if (v.reset <= t) buckets.delete(k);
    }
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
