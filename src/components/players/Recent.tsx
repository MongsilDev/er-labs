"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { aid: number; name: string };
const KEY = "tl-recent";
const MAX = 8;

function read(): Item[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isSafeInteger(x?.aid) && typeof x?.name === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

// 프로필을 열 때 이 브라우저에만 기록
export function Remember({ aid, name }: Item) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([{ aid, name }, ...read().filter((x) => x.aid !== aid)].slice(0, MAX)));
    } catch {}
  }, [aid, name]);
  return null;
}

export default function Recent() {
  const [items, setItems] = useState<Item[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 수화 뒤에만 읽을 수 있음
  useEffect(() => setItems(read()), []);
  if (!items.length) return null;
  return (
    <section className="recent">
      <div className="recent-head">
        <h2 className="h2">최근 본 계정</h2>
        <button
          type="button"
          className="link"
          onClick={() => {
            try {
              localStorage.removeItem(KEY);
            } catch {}
            setItems([]);
          }}
        >
          기록 지우기
        </button>
      </div>
      <ul className="recent-list">
        {items.map((x) => (
          <li key={x.aid}>
            <Link className="chip recent-chip" href={`/players/${x.aid}`} translate="no">
              {x.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
