import "server-only";
import type { CutData } from "@/er/lib/cut";

const URL_ = process.env.CUT_API || "https://bot.mongsil.dev/api/cut";
const TTL = 300_000;

let cached: { at: number; data: CutData } | null = null;
let pending: Promise<CutData | null> | null = null;

async function load(): Promise<CutData | null> {
  try {
    const res = await fetch(URL_, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as CutData;
    if (!data?.tiers?.eternity || !Array.isArray(data.rps)) return null;
    cached = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}

/** 몽실봇 이터컷 계산 결과. 5분 동안 같은 값, 봇이 응답하지 않으면 마지막 값이나 null */
export async function getCut(): Promise<CutData | null> {
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  pending ??= load().finally(() => {
    pending = null;
  });
  return (await pending) ?? cached?.data ?? null;
}
