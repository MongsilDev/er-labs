import { characterName } from "@/er/lib/format";

// 얼굴 이미지는 scripts/er/portraits.mjs로 cdn.mongsil.dev에 올림
const CDN = "https://cdn.mongsil.dev/er-labs/characters";

export default function Char({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="size-[22px] max-w-none flex-none rounded-full bg-field" src={`${CDN}/${name}.png`} alt="" width={22} height={22} loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />
      {characterName(name)}
    </span>
  );
}
