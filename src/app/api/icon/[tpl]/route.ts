import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { captureException } from "@sentry/node";
import sharp from "sharp";
import gearData from "@/tarkov/data/gear.json";
import items from "@/tarkov/data/items.json";
import { allow, clientIp } from "@/limits";
import { dataDir } from "@/tarkov/server/db";
import { USER_AGENT } from "@/tarkov/server/upstream";

export const dynamic = "force-dynamic";

const KNOWN = items as Record<string, string>;
const GEAR = gearData as unknown as Record<string, [number, number, string, string?]>;
const EMPTY = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const HEADERS = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=2592000, immutable" };
// tarkov.dev에 없는 그림은 1시간, 오류나 시간 초과로 받지 못한 그림은 5분 동안 다시 묻지 않음. 키는 허용 목록 안의 아이템이라 개수가 정해져 있음
// missed 값은 다시 물을 수 있는 시각
const g = globalThis as unknown as { __tlIconMiss?: Map<string, number>; __tlIconJobs?: Map<string, Promise<Uint8Array | null>> };
const missed = (g.__tlIconMiss ??= new Map());
const jobs = (g.__tlIconJobs ??= new Map());
const MISS_TTL = 3_600_000;
const RETRY_TTL = 300_000;

// 장비 칸 아이템은 종류가 많아 레포에 두지 않고, 처음 요청될 때 받아 데이터 폴더에 둠
// v=base는 장비 칸용 투명 배경 그림. 무기는 기본 프리셋 그림
export async function GET(req: Request, { params }: { params: Promise<{ tpl: string }> }) {
  const { tpl } = await params;
  const base = new URL(req.url).searchParams.get("v") === "base";
  if (!/^[0-9a-f]{24}$/.test(tpl) || !KNOWN[tpl]) return new Response(null, { status: 404 });
  const dir = join(dataDir(), "icons");
  const file = join(dir, `${base ? "base-" : ""}${tpl}.webp`);
  try {
    return new Response(new Uint8Array(await readFile(file)), { headers: HEADERS });
  } catch {}
  // 새로 나온 아이템은 tarkov.dev 그림이 늦게 생겨 장비 칸은 빈 그림으로 둠. 다시 물을 수 있을 때까지만 캐시
  const none = () => {
    const cache = { "Cache-Control": `public, max-age=${Math.max(0, Math.ceil(((missed.get(file) ?? 0) - Date.now()) / 1000))}` };
    return base ? new Response(EMPTY, { headers: { ...cache, "Content-Type": "image/gif" } }) : new Response(null, { status: 404, headers: cache });
  };
  const ip = await clientIp();
  if ((missed.get(file) ?? 0) > Date.now()) return none();
  let job = jobs.get(file);
  if (!job) {
    // 앞 요청의 작업이 파일을 쓰고 jobs에서 빠진 뒤라 첫 읽기만 실패했을 수 있음
    const saved = await readFile(file).catch(() => null);
    if (saved) return new Response(new Uint8Array(saved), { headers: HEADERS });
    job = jobs.get(file);
  }
  if (!job) {
    if ((missed.get(file) ?? 0) > Date.now()) return none();
    if (!allow(`icon:${ip}`, 120, 60_000)) return new Response(null, { status: 429, headers: { "Cache-Control": "no-store" } });
    job = download(tpl, base, file)
      .catch((e: unknown) => {
        console.error(`[아이콘] ${tpl} 실패`, e);
        captureException(e, { tags: { route: "/api/icon/[tpl]", kind: "route", tool: "tarkov" } });
        missed.set(file, Date.now() + RETRY_TTL);
        return null;
      })
      .finally(() => jobs.delete(file));
    jobs.set(file, job);
  }
  const buf = await job;
  return buf ? new Response(buf, { headers: HEADERS }) : none();
}

async function download(tpl: string, base: boolean, file: string): Promise<Uint8Array | null> {
  const urls = base
    ? [...new Set([GEAR[tpl]?.[3], tpl])].filter(Boolean).map((id) => `https://assets.tarkov.dev/${id}-512.webp`).concat(`https://assets.tarkov.dev/${tpl}-base-image.webp`)
    : [`https://assets.tarkov.dev/${tpl}-icon.webp`];
  let r: Response | null = null;
  let gone = true;
  for (const url of urls) {
    r = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (r?.ok) break;
    gone &&= r?.status === 404;
  }
  if (!r?.ok) {
    missed.set(file, Date.now() + (gone ? MISS_TTL : RETRY_TTL));
    return null;
  }
  const raw = new Uint8Array(await r.arrayBuffer());
  // 512px 원본은 장비 하나에 100KB를 넘어 칸 크기의 두 배 정도(최대 384x256)로 줄여 둠
  const buf = base ? new Uint8Array(await sharp(raw).resize(384, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()) : raw;
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, buf);
    await rename(tmp, file);
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
  return buf;
}
