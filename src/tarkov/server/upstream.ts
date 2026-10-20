import "server-only";

export const PLAYERS_BASE = (process.env.PLAYERS_BASE || "https://players.tarkov.dev").replace(/\/$/, "");
export const USER_AGENT = "Labs (+https://labs.mongsil.dev/tarkov)";

// 화면 조회는 0.5초, 비교군 수집은 1초 간격 제한을 따로 씀
type Lane = { gap: number; next: number };
const g = globalThis as unknown as { __tlLanes?: Record<string, Lane> };
const lanes = (g.__tlLanes ??= { view: { gap: 500, next: 0 }, crawl: { gap: 1000, next: 0 } });

async function wait(lane: keyof typeof lanes) {
  const l = lanes[lane];
  const t = Date.now();
  const at = Math.max(t, l.next);
  l.next = at + l.gap;
  if (at > t) await new Promise((r) => setTimeout(r, at - t));
}

export class Upstream extends Error {
  constructor(public status: number) {
    super(`upstream ${status}`);
  }
}

export async function fetchProfile(folder: string, aid: number, lane: "view" | "crawl" = "view"): Promise<unknown | null> {
  await wait(lane);
  const r = await fetch(`${PLAYERS_BASE}/${folder}/${aid}.json`, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    await r.body?.cancel();
    if (r.status === 404) return null;
    throw new Upstream(r.status);
  }
  return r.json();
}

export async function fetchStream(path: string, since?: string): Promise<{ body: ReadableStream<Uint8Array>; modified: string } | null> {
  const headers: Record<string, string> = { "user-agent": USER_AGENT };
  if (since) headers["if-modified-since"] = since;
  const r = await fetch(`${PLAYERS_BASE}/${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(300_000) });
  if (r.status === 304) return null;
  if (!r.ok || !r.body) throw new Upstream(r.status);
  return { body: r.body, modified: r.headers.get("last-modified") ?? "" };
}
