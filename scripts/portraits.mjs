// 실험체 얼굴 이미지를 dak.gg에서 받아 cdn.mongsil.dev 폴더에 저장. 새 실험체가 나오면 다시 실행
// 사용: node scripts/portraits.mjs ~/docker/cdn/public/er-labs/characters
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
if (!out) throw new Error("저장할 폴더를 지정해주세요.");
mkdirSync(out, { recursive: true });

const res = await fetch("https://er.dakgg.io/api/v1/data/characters?hl=en", { headers: { "User-Agent": "er-labs portraits" } });
const { characters } = await res.json();
let saved = 0;
for (const c of characters) {
  const file = join(out, `${c.key}.png`);
  if (existsSync(file)) continue;
  const img = await fetch(`https:${c.communityImageUrl}`);
  if (!img.ok) throw new Error(`${c.key} ${img.status}`);
  writeFileSync(file, Buffer.from(await img.arrayBuffer()));
  saved++;
  await new Promise((r) => setTimeout(r, 200));
}
console.log(`실험체 ${characters.length}명, 새로 받은 이미지 ${saved}장`);
