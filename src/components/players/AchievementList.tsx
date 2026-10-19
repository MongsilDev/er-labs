"use client";

import Image from "next/image";
import { useState } from "react";
import { date, dec } from "@/lib/format";

export type AchievementRow = { id: string; at: number; name: string; description: string; icon: boolean; rarity: string; percent: number };

const RARITY: Record<string, string> = { common: "일반", rare: "희귀", legendary: "전설", seasonal: "시즌" };

const SORTS = [
  { key: "recent", label: "최근 획득" },
  { key: "old", label: "오래된 순" },
  { key: "rare", label: "희귀한 순" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

// 시즌 업적은 달성 비율 자료가 없어 희귀한 순에서 뒤로 보냄
const ORDER: Record<Sort, (a: AchievementRow, b: AchievementRow) => number> = {
  recent: (a, b) => b.at - a.at,
  old: (a, b) => a.at - b.at,
  rare: (a, b) => (a.percent || 101) - (b.percent || 101) || b.at - a.at,
};

function Row({ a }: { a: AchievementRow }) {
  return (
    <li className={`ach ${a.rarity}`}>
      {a.icon ? <Image src={`/img/ach/${a.id}.webp`} alt="" width={36} height={36} unoptimized /> : <span className="ach-blank" />}
      <span className="ach-text">
        <b className="ellipsis">{a.name}</b>
        {a.description && <span className="ellipsis muted small">{a.description}</span>}
      </span>
      <span className="ach-side">
        <span className="small nowrap">
          <b className="ach-rarity">{RARITY[a.rarity] ?? a.rarity}</b>
          {a.percent ? <span className="muted num"> {dec(a.percent, 2)}%</span> : null}
        </span>
        <span className="muted small num nowrap">{date(a.at * 1000)}</span>
      </span>
    </li>
  );
}

export default function AchievementList({ rows }: { rows: AchievementRow[] }) {
  const [sort, setSort] = useState<Sort>("recent");
  const list = [...rows].sort(ORDER[sort]);
  return (
    <>
      <div className="ach-bar">
        <div className="seg" role="group" aria-label="업적 정렬">
          {SORTS.map((s) => (
            <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="sub small">비율은 tarkov.dev가 집계한 달성 비율입니다.</span>
      </div>
      <ul className="panel list achs">
        {list.slice(0, 8).map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </ul>
      {list.length > 8 && (
        <details className="more">
          <summary>나머지 {list.length - 8}개 보기</summary>
          <ul className="panel list achs">
            {list.slice(8).map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
