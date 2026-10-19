import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import items from "@/tarkov/data/items.json";
import { dataDir } from "@/tarkov/server/db";
import { USER_AGENT } from "@/tarkov/server/upstream";

export const dynamic = "force-dynamic";

const KNOWN = items as Record<string, string>;
const HEADERS = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=2592000, immutable" };

// 장비 칸 아이템은 종류가 많아 레포에 두지 않고, 처음 요청될 때 받아 데이터 폴더에 둠
export async function GET(_: Request, { params }: { params: Promise<{ tpl: string }> }) {
  const { tpl } = await params;
  if (!/^[0-9a-f]{24}$/.test(tpl) || !KNOWN[tpl]) return new Response(null, { status: 404 });
  const dir = join(dataDir(), "icons");
  const file = join(dir, `${tpl}.webp`);
  try {
    return new Response(new Uint8Array(await readFile(file)), { headers: HEADERS });
  } catch {}
  const r = await fetch(`https://assets.tarkov.dev/${tpl}-icon.webp`, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!r?.ok) return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=3600" } });
  const buf = new Uint8Array(await r.arrayBuffer());
  await mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, buf);
  await rename(tmp, file);
  return new Response(buf, { headers: HEADERS });
}
