// 실제 프로필 샘플에서 장비와 아이템을 빼고 닉네임과 aid를 바꿔 테스트 픽스처로 저장
// 사용: node scripts/fixtures.mjs <샘플 폴더>
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const src = process.argv[2];
if (!src) throw new Error("샘플 폴더를 지정해주세요");
const out = "test/fixtures";
const accounts = [
  { from: "3556253", to: 1001, name: "Fixture-Alpha" },
  { from: "3662", to: 1002, name: "Fixture-Bravo" },
  { from: "9706", to: 1003, name: "Fixture-Charlie" },
];
const folders = ["profile", "pvp-season", "pve", "arena"];
const drop = ["equipment", "items", "hideout", "hideoutAreaStashes", "customization", "customizationStash", "presetCustomization", "profileCustomization", "favoriteItems", "seasonalRewards", "battlePassProgress"];

for (const a of accounts) {
  for (const f of folders) {
    const file = join(src, `p${a.from}_${f}.json`);
    if (!existsSync(file)) continue;
    const p = JSON.parse(readFileSync(file, "utf8"));
    for (const k of drop) delete p[k];
    p.aid = a.to;
    p.info.nickname = a.name;
    mkdirSync(join(out, f), { recursive: true });
    writeFileSync(join(out, f, `${a.to}.json`), JSON.stringify(p) + "\n");
  }
}
