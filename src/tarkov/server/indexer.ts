import "server-only";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { captureException } from "@sentry/node";
import { FlatJsonReader } from "@/tarkov/lib/flatjson";
import { MODES, type ModeKey } from "@/tarkov/lib/modes";
import { db, getMeta, setMeta, tx } from "./db";
import { fetchStream } from "./upstream";

// players.tarkov.dev가 매일 올리는 이름 색인과 갱신 시각 색인을 받아 바뀐 행만 씀

const BATCH = 20_000;

async function readPairs(body: ReadableStream<Uint8Array>, flush: (pairs: [string, string | number][]) => void) {
  let pairs: [string, string | number][] = [];
  const reader = new FlatJsonReader((k, v) => {
    pairs.push([k, v]);
  });
  const decoder = new TextDecoder();
  for await (const chunk of Readable.fromWeb(body as NodeReadableStream<Uint8Array>)) {
    reader.push(decoder.decode(chunk as Buffer, { stream: true }));
    if (pairs.length >= BATCH) {
      flush(pairs);
      pairs = [];
    }
  }
  if (pairs.length) flush(pairs);
}

async function loadNames(folder: string, history: boolean): Promise<number> {
  const metaKey = `index:${folder}/index.json`;
  const res = await fetchStream(`${folder}/index.json`, getMeta(metaKey) ?? undefined);
  if (!res) return 0;
  const seenAt = Date.parse(res.modified) || Date.now();
  const conn = db();
  const get = conn.prepare("SELECT name FROM accounts WHERE aid = ?");
  const ins = conn.prepare("INSERT INTO accounts (aid, name, name_lc) VALUES (?, ?, ?)");
  const upd = conn.prepare("UPDATE accounts SET name = ?, name_lc = ? WHERE aid = ?");
  const hist = conn.prepare("INSERT INTO names (aid, old_name, new_name, seen_at) VALUES (?, ?, ?, ?)");
  const hidden = conn.prepare("SELECT 1 FROM hidden WHERE aid = ?");
  let changed = 0;
  await readPairs(res.body, (pairs) =>
    tx(() => {
      for (const [k, v] of pairs) {
        const aid = Number(k);
        const name = String(v);
        if (!Number.isSafeInteger(aid) || !name) continue;
        const row = get.get(aid) as { name: string } | undefined;
        if (!row) ins.run(aid, name, name.toLowerCase());
        else if (row.name !== name) {
          upd.run(name, name.toLowerCase(), aid);
          if (history && !hidden.get(aid)) hist.run(aid, row.name, name, seenAt);
          changed++;
        }
      }
    }),
  );
  setMeta(metaKey, res.modified);
  return changed;
}

async function loadUpdated(folder: string, key: ModeKey): Promise<void> {
  const metaKey = `index:${folder}/updated.json`;
  const res = await fetchStream(`${folder}/updated.json`, getMeta(metaKey) ?? undefined);
  if (!res) return;
  const col = `u_${key}`;
  const upd = db().prepare(`UPDATE accounts SET ${col} = ? WHERE aid = ? AND ${col} IS NOT ?`);
  await readPairs(res.body, (pairs) =>
    tx(() => {
      for (const [k, v] of pairs) {
        const aid = Number(k);
        const ts = Number(v);
        if (Number.isSafeInteger(aid) && Number.isFinite(ts)) upd.run(ts, aid, ts);
      }
    }),
  );
  setMeta(metaKey, res.modified);
}

const g = globalThis as unknown as { __tlIndexing?: boolean };

export async function runIndex(): Promise<boolean> {
  if (g.__tlIndexing) return false;
  g.__tlIndexing = true;
  const t0 = Date.now();
  try {
    // 첫 적재 때는 이력을 남기지 않음
    const history = getMeta("names_ready") === "1";
    let changed = 0;
    for (const m of MODES) {
      changed += await loadNames(m.folder, history);
      await loadUpdated(m.folder, m.key);
    }
    setMeta("names_ready", "1");
    setMeta("accounts", String((db().prepare("SELECT COUNT(*) AS c FROM accounts").get() as { c: number }).c));
    setMeta("indexed_at", String(Date.now()));
    console.log(`[색인] 완료 ${Math.round((Date.now() - t0) / 1000)}초, 닉네임 변경 ${changed}건`);
    return true;
  } catch (e) {
    console.error("[색인] 실패", e);
    captureException(e);
    return false;
  } finally {
    g.__tlIndexing = false;
  }
}
