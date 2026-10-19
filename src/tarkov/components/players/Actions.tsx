"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Lines from "@/components/Lines";

export default function Actions({ aid, mode, tarkovDev }: { aid: number; mode: string; tarkovDev: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const away = useRef(false);

  const refresh = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/players/${aid}/refresh?mode=${mode}`, { method: "POST" });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) setMsg(data.error ?? "다시 불러오지 못했습니다.");
      else router.refresh();
    } catch {
      setMsg("다시 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // tarkov.dev에서 열면 공개 JSON이 갱신되므로 돌아오면 한 번 다시 받음
  useEffect(() => {
    const onFocus = () => {
      if (!away.current) return;
      away.current = false;
      refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });

  return (
    <div className="acts">
      <a className="btn sm" href={tarkovDev} target="_blank" rel="noreferrer" onClick={() => (away.current = true)}>
        tarkov.dev에서 갱신
      </a>
      <button className="btn sm" type="button" disabled={busy} onClick={refresh}>
        {busy ? "불러오는 중" : "다시 불러오기"}
      </button>
      <button
        className="btn sm"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href);
            setMsg("주소를 복사했습니다.");
          } catch {
            setMsg("주소를 복사하지 못했습니다.");
          }
        }}
      >
        주소 복사
      </button>
      {msg && (
        <span className="small muted" role="status">
          <Lines text={msg} />
        </span>
      )}
    </div>
  );
}
