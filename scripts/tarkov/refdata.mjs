// json.tarkov.dev에서 레벨 표, 업적, 시즌 특성을 받아 src/tarkov/data에, 아이콘은 public/kord/perks와 public/img에 저장
// 아이콘 축소에 macOS sips를 씀
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const UA = { "user-agent": "Labs (+https://labs.mongsil.dev/tarkov)" };
const get = async (path) => {
  const r = await fetch(`https://json.tarkov.dev/${path}`, { headers: UA });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return (await r.json()).data;
};

const [items, itemsKo, tasks, ko, season, seasonKo, seasonEn] = await Promise.all([
  get("regular/items"),
  get("regular/items_ko"),
  get("regular/tasks"),
  get("regular/tasks_ko"),
  get("pvp-season/season"),
  get("pvp-season/season_ko"),
  get("pvp-season/season_en"),
]);

let total = 0;
const levels = items.playerLevels.map((l) => (total += l.exp));
writeFileSync("src/tarkov/data/levels.json", JSON.stringify(levels) + "\n");

const download = async (url, out) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
};
const pool = async (jobs, n = 8) => {
  const q = [...jobs];
  await Promise.all(Array.from({ length: n }, async () => {
    while (q.length) await q.shift()();
  }));
};
// 장비 칸에 장착하는 아이템과 보안 컨테이너만 이름을 남김. 아이콘은 화면에서 쓸 때 서버가 받아 둠
const KEEP = new Set(["gun", "wearable", "armor", "rig", "backpack", "headphones", "helmet", "glasses", "mask"]);
const itemNames = {};
for (const it of Object.values(items.items)) {
  if (it.types.some((t) => KEEP.has(t)) || /secure container/i.test(it.name)) itemNames[it.id] = itemsKo[it.name] ?? it.name;
}
writeFileSync("src/tarkov/data/items.json", JSON.stringify(itemNames) + "\n");

const skills = {};
for (const sk of items.skills) skills[sk.id] = itemsKo[sk.name] ?? sk.name;
writeFileSync("src/tarkov/data/skills.json", JSON.stringify(skills, null, 1) + "\n");
const mastering = {};
for (const m of items.mastering) mastering[m.id] = { weapon: m.weapons.find((w) => itemNames[w]) ?? null, level2: m.level2, level3: m.level3 };
writeFileSync("src/tarkov/data/mastering.json", JSON.stringify(mastering) + "\n");

for (const d of ["public/img/ach", "public/img/level", "public/img/prestige", "public/img/skill"]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
const badges = items.playerLevels.map((l) => Number(/group-(\d+)/.exec(l.levelBadgeImageLink)?.[1] ?? 0));
writeFileSync("src/tarkov/data/level-badges.json", JSON.stringify(badges) + "\n");
const jobs = [...new Set(badges)].map((g) => () => download(`https://assets.tarkov.dev/player-level-group-${g}.png`, `public/img/level/${g}.png`));
for (const sk of items.skills) if (sk.imageLink) jobs.push(() => download(sk.imageLink, `public/img/skill/${sk.id}.webp`));
for (const p of tasks.prestige) jobs.push(() => download(p.iconLink, `public/img/prestige/${p.prestigeLevel}.webp`));
for (const a of Object.values(tasks.achievements)) if (a.imageLink) jobs.push(() => download(a.imageLink, `public/img/ach/${a.id}.webp`));
await pool(jobs);

const achievements = {};
for (const a of Object.values(tasks.achievements)) {
  achievements[a.id] = {
    name: ko[`${a.id} name`] ?? a.normalizedName,
    description: ko[`${a.id} description`] ?? "",
    icon: Boolean(a.imageLink),
    rarity: a.normalizedRarity,
    percent: a.playersCompletedPercent,
    hidden: a.hidden,
  };
}
writeFileSync("src/tarkov/data/achievements.json", JSON.stringify(achievements, null, 1) + "\n");
const perk = (p) => ({
  id: p.id,
  name: seasonKo[`${p.id} name`] ?? seasonEn[`${p.id} name`],
  en: seasonEn[`${p.id} name`],
  effects: (seasonKo[`${p.id} description`] ?? seasonEn[`${p.id} description`] ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
  ...(p.points == null ? {} : { points: p.points, exclusive: p.exclusiveToPerks }),
});
const perks = {
  name: seasonEn[season.name] ?? season.name,
  common: season.perks.common.map(perk),
  personal: season.perks.personal.map(perk),
};
writeFileSync("src/tarkov/data/season.json", JSON.stringify(perks, null, 1) + "\n");

const dir = "public/kord/perks";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
for (const p of [...season.perks.common, ...season.perks.personal]) {
  const r = await fetch(p.imageLink, { headers: UA });
  if (!r.ok) throw new Error(`${p.imageLink} ${r.status}`);
  const tmp = `/tmp/perk-${p.id}.webp`;
  writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  execFileSync("sips", ["-s", "format", "png", "-Z", "96", tmp, "--out", `${dir}/${p.id}.png`], { stdio: "ignore" });
  rmSync(tmp);
}
console.log(`아이템 ${Object.keys(itemNames).length}개, 스킬 ${items.skills.length}개, 레벨 ${levels.length}개, 업적 ${Object.keys(achievements).length}개, 시즌 특성 ${perks.common.length + perks.personal.length}개`);
