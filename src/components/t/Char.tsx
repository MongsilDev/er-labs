import { characterName } from "@/lib/format";

// 얼굴 이미지는 scripts/portraits.mjs로 cdn.mongsil.dev에 올림
const CDN = "https://cdn.mongsil.dev/er-labs/characters";

export default function Char({ name }: { name: string }) {
  return (
    <span className="char">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${CDN}/${name}.png`} alt="" width={22} height={22} loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />
      {characterName(name)}
    </span>
  );
}
