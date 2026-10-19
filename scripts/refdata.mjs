// json.tarkov.dev에서 레벨 표와 업적 정보를 받아 src/data에 저장
import { writeFileSync } from "node:fs";

const UA = { "user-agent": "TarkovLabs (+https://tarkov.mongsil.dev)" };
const get = async (path) => {
  const r = await fetch(`https://json.tarkov.dev/${path}`, { headers: UA });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return (await r.json()).data;
};

const [items, tasks, ko] = await Promise.all([get("regular/items"), get("regular/tasks"), get("regular/tasks_ko")]);

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
console.log(`레벨 ${levels.length}개, 업적 ${Object.keys(achievements).length}개`);
