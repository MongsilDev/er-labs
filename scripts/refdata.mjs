// json.tarkov.dev에서 레벨 표, 업적, 시즌 특성을 받아 src/data와 public/kord/perks에 저장
// 아이콘 축소에 macOS sips를 씀
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const UA = { "user-agent": "TarkovLabs (+https://tarkov.mongsil.dev)" };
const get = async (path) => {
  const r = await fetch(`https://json.tarkov.dev/${path}`, { headers: UA });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return (await r.json()).data;
};

const [items, tasks, ko, season, seasonKo, seasonEn] = await Promise.all([
  get("regular/items"),
  get("regular/tasks"),
  get("regular/tasks_ko"),
  get("pvp-season/season"),
  get("pvp-season/season_ko"),
  get("pvp-season/season_en"),
]);

let total = 0;
const levels = items.playerLevels.map((l) => (total += l.exp));
writeFileSync("src/data/levels.json", JSON.stringify(levels) + "\n");

const achievements = {};
for (const a of Object.values(tasks.achievements)) {
  achievements[a.id] = {
    name: ko[`${a.id} name`] ?? a.normalizedName,
    rarity: a.normalizedRarity,
    percent: a.playersCompletedPercent,
    hidden: a.hidden,
  };
}
writeFileSync("src/data/achievements.json", JSON.stringify(achievements, null, 1) + "\n");
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
writeFileSync("src/data/season.json", JSON.stringify(perks, null, 1) + "\n");

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
console.log(`레벨 ${levels.length}개, 업적 ${Object.keys(achievements).length}개, 시즌 특성 ${perks.common.length + perks.personal.length}개`);
