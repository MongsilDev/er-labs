// 실험체 영문 이름과 한국어 이름 대응표를 만든다. ER_API_KEY 필요
import { writeFileSync } from "node:fs";

const key = process.env.ER_API_KEY;
if (!key) {
  console.error("ER_API_KEY가 필요합니다.");
  process.exit(1);
}
const get = async (url) => {
  const res = await fetch(url, { headers: { "x-api-key": key } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
};
const chars = (await get("https://open-api.bser.io/v2/data/Character")).data;
const l10n = await get("https://open-api.bser.io/v1/l10n/Korean");
const text = await (await fetch(l10n.data.l10Path)).text();
const ko = new Map([...text.matchAll(/^Character\/Name\/(\d+)┃(.+)$/gm)].map((m) => [Number(m[1]), m[2].trim()]));
const map = Object.fromEntries(
  chars
    .filter((c) => ko.has(c.code))
    .sort((a, b) => a.code - b.code)
    .map((c) => [c.name, ko.get(c.code)]),
);
writeFileSync(new URL("../src/data/characters.json", import.meta.url), JSON.stringify(map, null, 2) + "\n");
console.log(`실험체 ${Object.keys(map).length}명`);
