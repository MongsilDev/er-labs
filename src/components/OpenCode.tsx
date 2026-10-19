"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readRecent, type Recent } from "@/lib/client";
import { remaining } from "@/lib/format";
import { MODE_LABEL } from "@/lib/rules";
import { useNow } from "@/lib/useNow";
import type { MyTournament } from "@/lib/view";
import Lines from "./Lines";

export default function OpenCode({ mine }: { mine: MyTournament[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);
  const [error, setError] = useState("");
  const now = useNow();
  useEffect(() => {
    const t = setTimeout(() => setRecent(readRecent()), 0);
    return () => clearTimeout(t);
  }, []);
  const mineCodes = new Set(mine.map((m) => m.code));
  const others = recent.filter((r) => !mineCodes.has(r.code));
  return (
    <>
      {mine.length > 0 && (
        <section className="panel mine" aria-labelledby="mine-h">
          <h2 className="h2" id="mine-h">
            내 대회
          </h2>
          <ul className="tlist">
            {mine.map((m) => (
              <li key={m.code}>
                <Link href={`/t/${m.code}/a`}>
                  <span className="tl-top">
                    <b className="ellipsis">{m.name}</b>
                    <span className="chip">{m.role === "owner" ? "개최자" : "운영자"}</span>
                  </span>
                  <span className="tl-meta">
                    {MODE_LABEL[m.mode]}, {m.groupCount > 1 ? `${m.groupCount}개 조` : m.played ? `${m.played}라운드 진행` : "시작 전"}, {m.code}
                    {now !== null && `, ${remaining(m.expiresAt, now)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="panel open" aria-labelledby="open-h">
        <h2 className="h2" id="open-h">
          대회 열기
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (!/^[A-Z0-9]{6}$/.test(c)) return setError("대회 코드는 영문과 숫자 6자입니다.");
            router.push(`/t/${c}/a`);
          }}
        >
          <label className="lbl" htmlFor="code">
            대회 코드
          </label>
          <div className="codein-row">
            <input
              id="code"
              name="code"
              className="field code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              placeholder="ABC123"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
            />
            <button className="btn primary">열기</button>
          </div>
          {error && (
            <p className="err" role="alert">
              <Lines text={error} />
            </p>
          )}
        </form>
        {others.length > 0 && (
          <>
            <h3 className="recent-t">이 브라우저에서 연 대회</h3>
            <ul className="tlist">
              {others.map((r) => (
                <li key={r.code}>
                  <Link href={`/t/${r.code}/a`}>
                    <span className="tl-top">
                      <b className="ellipsis">{r.name}</b>
                    </span>
                    <span className="tl-meta">{r.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
