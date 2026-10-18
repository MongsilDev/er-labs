"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { fmt1 } from "@/lib/format";
import type { TournamentView } from "@/lib/view";
import Bar from "./t/Bar";
import { useResult } from "./t/TournamentApp";
import "./overlay.css";

export default function Overlay({ initial, groupIdx, limit }: { initial: TournamentView; groupIdx: number; limit: number }) {
  const [view, setView] = useState(initial);
  const version = useRef(initial.version);
  const result = useResult(view, groupIdx);
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("overlay-page");
    const t = setInterval(async () => {
      try {
        const next = await api.view(view.code, version.current);
        if (next) {
          version.current = next.version;
          setView(next);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [view.code]);
  const g = view.groups[groupIdx];
  const rows = result.standings.slice(0, limit);
  const max = Math.max(1, ...result.standings.map((s) => s.roundScore));
  const status = result.ended ? "최종 순위" : result.played ? `${result.played}라운드 종료` : "경기 전";
  return (
    <div className="ov">
      <div className="ov-hd">
        <b>
          {view.name}
          {view.groupCount > 1 ? ` ${g.label}조` : ""}
        </b>
        <span>{status}</span>
      </div>
      {rows.map((s) => (
        <div key={s.key} className={`ov-row${view.rules.advance > 0 && s.rank === view.rules.advance ? " cut" : ""}`}>
          <span className={`rk ${s.rank === 1 ? "first" : view.rules.advance > 0 && s.rank <= view.rules.advance ? "adv" : ""}`}>{s.rank}</span>
          <div className="ov-mid">
            <div className="ov-nm">
              <span>{s.name}</span>
              {s.fixed ? <i className="cp">{s.fixed}위 확정</i> : s.checkpoint && view.mode !== "points" ? <i className="cp">체크포인트</i> : null}
            </div>
            <Bar s={s} max={max} rounds={result.played} height={6} labels={false} />
          </div>
          <span className="ov-tt">{fmt1(s.total)}</span>
        </div>
      ))}
      <div className="ov-ft">er.mongsil.dev</div>
    </div>
  );
}
