import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { attachBuilds, hasBuild, renderBuilds } from "@/tarkov/server/builds";
import { parseEft } from "@/tarkov/lib/summary";

const kit = (ids: string[]) => ({
  equipment: {
    Id: "root",
    Items: [
      { _id: "root", _tpl: "x" },
      { _id: ids[0], _tpl: "gun", parentId: "root", slotId: "FirstPrimaryWeapon", upd: { FireMode: { FireMode: "single" } } },
      { _id: ids[1], _tpl: "stock", parentId: ids[0], slotId: "mod_stock" },
      { _id: ids[2], _tpl: "pad", parentId: ids[1], slotId: "mod_pad" },
      { _id: "h", _tpl: "helmet", parentId: "root", slotId: "Headwear" },
    ],
  },
});

describe("무기 조립 그림 요청", () => {
  it("tarkov.dev와 같은 모양으로 저장하고 아이템 ID가 달라도 같은 조립이면 같은 키", () => {
    process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "builds-"));
    const a = kit(["w1", "s1", "p1"]), b = kit(["w2", "s2", "p2"]);
    const sa = parseEft(a), sb = parseEft(b);
    attachBuilds(sa, a);
    attachBuilds(sb, b);
    const key = sa.gear!.find((g) => g.slot === "FirstPrimaryWeapon")!.build!;
    expect(key).toMatch(/^[0-9a-f]{20}$/);
    expect(sb.gear!.find((g) => g.slot === "FirstPrimaryWeapon")!.build).toBe(key);
    expect(sa.gear!.find((g) => g.slot === "Headwear")!.build).toBeUndefined();
    const body = JSON.parse(readFileSync(join(process.env.DATA_DIR, "builds", `${key}.json`), "utf8"));
    expect(body.id).toBe("w1");
    expect(body.items.map((i: { _id: string }) => i._id)).toEqual(["w1", "s1", "p1"]);
    expect(body.items[0]).toEqual({ _id: "w1", _tpl: "gun", upd: { FireMode: { FireMode: "single" } } });
  });

  it("서비스가 503이면 그 회차를 멈추고, 받으면 저장하고, 400이면 다시 묻지 않음", async () => {
    process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "builds-"));
    const raws = [kit(["a1", "a2", "a3"]), { equipment: { Id: "root", Items: [{ _id: "root", _tpl: "x" }, { _id: "b1", _tpl: "gun2", parentId: "root", slotId: "Holster" }, { _id: "b2", _tpl: "mag", parentId: "b1", slotId: "mod_magazine" }] } }];
    const keys = raws.map((raw) => {
      const s = parseEft(raw);
      attachBuilds(s, raw);
      return s.gear!.find((g) => g.build)!.build!;
    });
    const png = await sharp({ create: { width: 900, height: 300, channels: 4, background: "#000" } }).png().toBuffer();
    const calls: string[] = [];
    const reply = vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(null, { status: 503 });
    });
    vi.stubGlobal("fetch", reply);
    await renderBuilds();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^https:\/\/imagemagic\.tarkov\.dev\/item\/\w+\.webp\?data=/);
    expect(keys.some(hasBuild)).toBe(false);

    reply.mockImplementation(async (url: string) => (url.includes("/item/a1.") ? new Response(new Uint8Array(png)) : new Response("bad", { status: 400 })));
    await renderBuilds();
    expect(hasBuild(keys[0])).toBe(true);
    expect(existsSync(join(process.env.DATA_DIR, "builds", `${keys[1]}.bad`))).toBe(true);
    const meta = await sharp(readFileSync(join(process.env.DATA_DIR, "builds", `${keys[0]}.webp`))).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 768, 256]);

    reply.mockClear();
    await renderBuilds();
    expect(reply).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 15_000);
});
