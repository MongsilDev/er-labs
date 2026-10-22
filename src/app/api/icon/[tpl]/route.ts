import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import gearData from "@/tarkov/data/gear.json";
import items from "@/tarkov/data/items.json";
import { dataDir } from "@/tarkov/server/db";
import { USER_AGENT } from "@/tarkov/server/upstream";

export const dynamic = "force-dynamic";

const KNOWN = items as Record<string, string>;
const GEAR = gearData as unknown as Record<string, [number, number, string, string?]>;
const EMPTY = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const HEADERS = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=2592000, immutable" };
// tarkov.dev에 없는 그림은 1시간 동안 다시 묻지 않음. 키는 허용 목록 안의 아이템이라 개수가 정해져 있음
const g = globalThis as unknown as { __tlIconMiss?: Map<string, number> };
const missed = (g.__tlIconMiss ??= new Map());
const MISS_TTL = 3_600_000;

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
  // 새로 나온 아이템은 tarkov.dev 그림이 늦게 생겨 장비 칸은 빈 그림으로 둠
  const none = () =>
    base ? new Response(EMPTY, { headers: { "Content-Type": "image/gif", "Cache-Control": "public, max-age=3600" } }) : new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  if (Date.now() - (missed.get(file) ?? -Infinity) < MISS_TTL) return none();
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
    if (gone) missed.set(file, Date.now());
    return none();
  }
  const raw = new Uint8Array(await r.arrayBuffer());
  // 512px 원본은 장비 하나에 100KB를 넘어 칸 크기의 두 배 정도(최대 384x256)로 줄여 둠
  const buf = base ? new Uint8Array(await sharp(raw).resize(384, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()) : raw;
  await mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, buf);
  await rename(tmp, file);
  return new Response(buf, { headers: HEADERS });
}
