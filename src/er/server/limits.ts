import "server-only";

type Bucket = { count: number; reset: number };
const g = globalThis as unknown as { __erLimits?: Map<string, Bucket> };
const buckets = (g.__erLimits ??= new Map());

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

// 없는 대회 코드를 반복해 여는 IP는 있는 코드도 잠시 막음
export function miss(ip: string) {
  allow(`miss:${ip}`, 1_000_000, 10 * 60_000);
}

export function blocked(ip: string): boolean {
  const b = buckets.get(`miss:${ip}`);
  return Boolean(b && b.reset > Date.now() && b.count >= 30);
}
