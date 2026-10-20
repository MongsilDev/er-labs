// Epic 런처 API에서 아레나 도전과제 영어 이름, 설명, 달성률, 아이콘을 받아 src/tarkov/data/arena-achievements.json과 public/img/ach에 저장
// 게임 ID와 Epic 키를 잇는 공개 자료가 없어, 2026-10-20 아레나 계정 250개의 전적과 획득 순서로 확인한 28개만 둠
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const sharp = createRequire(createRequire(import.meta.url).resolve("next"))("sharp");

const IDS = {
  "6722612dab4a24e9da0361aa": "TheFirstHero",
  "67229d0a04774d33a2056d55": "BornSurvivor",
  "67229dd443d757b68f0975a2": "WinnerTakesAll",
  "67229e44ab4a24e9da0361da": "TeamGame",
  "67229e9a7c8c397a5004f43d": "AssaultRifleMaster",
  "6722a00eab4a24e9da0361dd": "AssaultRifleExpert",
  "6722a08f6006cd22c70fce8e": "MachineGunMaster",
  "6722a10504774d33a2056d59": "MachineGunExpert",
  "6722a1556006cd22c70fce91": "MarksmanRifleMaster",
  "6722a28604774d33a2056d5c": "MarksmanRifleExpert",
  "6722a32c58871c73f3038bbc": "AssaultCarbineMaster",
  "6722a3d58d46d067f60eee90": "AssaultCarbineExpert",
  "6722a44aab4a24e9da0361e3": "BoltActionRifleMaster",
  "6722a4bb7c8c397a5004f441": "BoltActionRifleExpert",
  "6722a5092bcba14c030b7df1": "SubmachineGunMaster",
  "6722a58726925a3eb600de2c": "SubmachineGunExpert",
  "6722a5d28d46d067f60eee93": "ShotgunMaster",
  "6722a6c526925a3eb600de2f": "ShotgunExpert",
  "6722a73e26925a3eb600de32": "PistolMaster",
  "6722a7d46006cd22c70fce95": "PistolExpert",
  "6722a8758d46d067f60eee97": "MeleeMaster",
  "6722a8e1ab4a24e9da0361e6": "MeleeExpert",
  "6722a927297a7399d80b50d5": "ThrowablesMaster",
  "6722a99e297a7399d80b50d8": "ThrowablesExpert",
  "6722c3ee26925a3eb600de3d": "GoodJob",
  "6722c41b8d46d067f60eee9e": "BestoftheBest",
  "6722c44c58871c73f3038bc7": "ResilientGladiator",
  "6722c47704774d33a2056d66": "FreedomContender",
};

const r = await fetch("https://launcher.store.epicgames.com/graphql", {
  method: "POST",
  headers: { "content-type": "application/json", "user-agent": "EpicGamesLauncher" },
  body: JSON.stringify({
    query: `{ Achievement { productAchievementsRecordBySandbox(sandboxId: "74d748b2912e49dd842e389a20f78c93", locale: "en") {
      achievements { achievement { name unlockedDisplayName unlockedDescription unlockedIconLink rarity { percent } } } } } }`,
  }),
});
if (!r.ok) throw new Error(`epic ${r.status}`);
const epic = new Map((await r.json()).data.Achievement.productAchievementsRecordBySandbox.achievements.map(({ achievement: a }) => [a.name, a]));

const out = {};
for (const [id, key] of Object.entries(IDS)) {
  const a = epic.get(key);
  if (!a) throw new Error(`Epic 목록에 ${key} 없음`);
  const icon = await fetch(a.unlockedIconLink);
  if (!icon.ok) throw new Error(`${key} 아이콘 ${icon.status}`);
  await sharp(Buffer.from(await icon.arrayBuffer())).resize(96, 96).webp({ quality: 90 }).toFile(`public/img/ach/${id}.webp`);
  out[id] = { name: a.unlockedDisplayName, description: a.unlockedDescription, icon: true, rarity: "", percent: a.rarity.percent, hidden: false };
}
writeFileSync("src/tarkov/data/arena-achievements.json", JSON.stringify(out, null, 1) + "\n");
console.log(`아레나 도전과제 ${Object.keys(out).length}개`);
