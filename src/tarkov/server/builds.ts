import "server-only";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import type { Summary } from "@/tarkov/lib/summary";
import { dataDir } from "./db";
import { USER_AGENT } from "./upstream";

// 부착물까지 단 무기 그림은 tarkov.dev의 imagemagic만 그림. 프로필을 받을 때 요청 내용을 저장해 두고 작업이 따로 받아 옴
const dir = () => join(dataDir(), "builds");
const GUN = /PrimaryWeapon|Holster/;

type Item = { _id?: unknown; _tpl?: unknown; parentId?: unknown; slotId?: unknown; [k: string]: unknown };

export function attachBuilds(summary: Summary, raw: unknown) {
  if (!summary.gear?.length) return;
  const eq = (raw as { equipment?: { Id?: unknown; id?: unknown; Items?: unknown; items?: unknown } } | null)?.equipment;
  const all = (Array.isArray(eq?.Items) ? eq.Items : Array.isArray(eq?.items) ? eq.items : []) as Item[];
  const root = eq?.Id ?? eq?.id;
  for (const g of summary.gear) {
    if (!GUN.test(g.slot)) continue;
    const top = all.find((x) => x.parentId === root && x.slotId === g.slot);
    if (!top) continue;
    // tarkov.dev 화면의 getItemParts와 같은 모양. 서비스 응답을 확인하지 못해 형식을 그대로 따름
    const items: Item[] = [];
    for (const i of all) if (i._id === top._id || items.some((j) => j._id === i.parentId)) items.push({ ...i });
    if (items.length < 2) continue;
    delete items[0].parentId;
    delete items[0].slotId;
    const kids = (id: unknown): string =>
      items
        .filter((x) => x.parentId === id)
        .map((x) => `${String(x.slotId)}:${String(x._tpl)}(${kids(x._id)})`)
        .sort()
        .join(",");
    const hash = createHash("sha1").update(`${String(top._tpl)}(${kids(top._id)})`).digest("hex").slice(0, 20);
    const file = join(dir(), `${hash}.json`);
    if (!existsSync(file)) {
      mkdirSync(dir(), { recursive: true });
      writeFileSync(file, JSON.stringify({ id: top._id, items }));
    }
    g.build = hash;
  }
}

export const hasBuild = (hash: string) => existsSync(join(dir(), `${hash}.webp`));

export const readBuild = (hash: string) => readFileSync(join(dir(), `${hash}.webp`));

// 서비스가 내려가 있으면 첫 실패에서 이번 회차를 멈춤. 속도 제한은 IP당 10초 25건
let running = false;

export async function renderBuilds() {
  if (running) return;
  running = true;
  try {
    await renderPending();
  } finally {
    running = false;
  }
}

async function renderPending() {
  let files: string[];
  try {
    files = readdirSync(dir());
  } catch {
    return;
  }
  const done = new Set(files.filter((f) => f.endsWith(".webp") || f.endsWith(".bad")).map((f) => f.split(".")[0]));
  const todo = files.filter((f) => f.endsWith(".json") && !done.has(f.slice(0, -5)));
  let made = 0;
  for (const f of todo) {
    const hash = f.slice(0, -5);
    const body = JSON.parse(readFileSync(join(dir(), f), "utf8")) as { id: string };
    const url = `https://imagemagic.tarkov.dev/item/${body.id}.webp?${new URLSearchParams({ data: JSON.stringify(body) })}`;
    const r = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (!r || r.status >= 500 || r.status === 429) break;
    if (!r.ok) {
      writeFileSync(join(dir(), `${hash}.bad`), String(r.status));
      continue;
    }
    const buf = await sharp(new Uint8Array(await r.arrayBuffer()))
      .resize(768, 256, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
    const tmp = join(dir(), `${hash}.${process.pid}.tmp`);
    writeFileSync(tmp, buf);
    renameSync(tmp, join(dir(), `${hash}.webp`));
    made++;
    await new Promise((res) => setTimeout(res, 3_000));
  }
  if (made) console.log(`[무기 그림] ${made}개 받음, 남은 ${todo.length - made}개`);
}
