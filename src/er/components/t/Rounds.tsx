"use client";

import { useState } from "react";
import type { GroupResult } from "@/er/lib/engine";
import { fmt1, rampColor } from "@/er/lib/format";
import { MAIN_WEATHERS, SUB_WEATHERS, type Mode } from "@/er/lib/rules";
import type { GroupView, Op } from "@/er/lib/view";
import Char from "./Char";

type Props = {
  group: GroupView;
  result: GroupResult;
  mode: Mode;
  planned: number;
  multi: boolean;
  editable: boolean;
  run: (op: Op) => Promise<unknown>;
  pickFiles: (round?: number) => void;
  openManual: (round: number) => void;
};

export default function Rounds({ group, result, mode, planned, multi, editable, run, pickFiles, openManual }: Props) {
  const [weatherFor, setWeatherFor] = useState<number | null>(null);
  const rows = new Map(group.rounds.map((r) => [r.roundNo, r]));
  const { rounds, next, ended, played } = result;

  const drop = editable && played === 0;

  return (
    <div className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-start gap-2.5 max-[760px]:grid-cols-2 ${drop ? "mt-2 w-full" : "mb-4"}`}>
      {rounds.map((r) => {
        const row = rows.get(r.roundNo);
        return (
          <section key={r.roundNo} className="panel flex min-w-0 flex-col gap-2 px-3.5 py-3" aria-label={`${r.roundNo}라운드`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-3 flex-none rounded-[2px]" style={{ background: rampColor(r.roundNo - 1, played) }} />
              <b className="text-[15px] font-extrabold whitespace-nowrap">{r.roundNo}라운드</b>
              {r.source === "manual" ? <span className="chip dashed">직접 입력</span> : <span className="ml-auto text-[12px] text-fg-3 max-[760px]:hidden">{r.gameId}</span>}
            </div>
            {row ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip">{r.main}</span>
                  {r.sub && <span className="chip">{r.sub}</span>}
                </div>
                {r.winner && (
                  <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 text-[13px]">
                    <span className="text-fg-3">1위</span>
                    <span className="min-w-0 truncate">{r.winner}</span>
                  </div>
                )}
                {editable && (
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 max-[760px]:*:min-h-8">
                    <button type="button" className="link" onClick={() => setWeatherFor(r.roundNo)}>날씨</button>
                    <button type="button" className="link" onClick={() => pickFiles(r.roundNo)}>CSV 교체</button>
                    <button type="button" className="link" onClick={() => openManual(r.roundNo)}>직접 입력</button>
                    <button type="button" className="link danger" onClick={() => run({ op: "delete_round", id: row.id })}>삭제</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[13px] text-fg-3">
                기록 없음
                {editable && (
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 max-[760px]:*:min-h-8">
                    <button type="button" className="link" onClick={() => pickFiles(r.roundNo)}>CSV 올리기</button>
                    <button type="button" className="link" onClick={() => openManual(r.roundNo)}>직접 입력</button>
                  </div>
                )}
              </div>
            )}
            {weatherFor === r.roundNo && (
              <WeatherEdit
                main={r.main}
                sub={r.sub}
                onClose={() => setWeatherFor(null)}
                onSave={async (main, sub) => {
                  await run({ op: "set_weather", group: group.idx, round: r.roundNo, main, sub });
                  setWeatherFor(null);
                }}
              />
            )}
          </section>
        );
      })}

      {next && (
        <section className="panel flex min-w-0 flex-col gap-2 px-3.5 py-3 col-span-2 border-line-strong max-[760px]:-order-1 max-[760px]:col-span-full" aria-label={`${next.roundNo}라운드 다음 경기`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-3 flex-none rounded-[2px]" style={{ background: "var(--line)" }} />
            <b className="text-[15px] font-extrabold whitespace-nowrap">{next.roundNo}라운드</b>
            <span className="chip strong">다음 경기</span>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-[13px] [&>dd]:min-w-0 [&>dt]:whitespace-nowrap [&>dt]:text-fg-3">
            <dt>{editable ? <label htmlFor={`mw-${group.idx}`}>메인 날씨</label> : "메인 날씨"}</dt>
            <dd>
              {editable ? (
                <select
                  id={`mw-${group.idx}`}
                  className="field sm mini"
                  value={next.main}
                  onChange={(e) => run({ op: "set_weather", group: group.idx, round: next.roundNo, main: e.target.value })}
                >
                  {MAIN_WEATHERS.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              ) : (
                next.main
              )}
              {next.weatherPick && <span className="ml-2 text-[12px] whitespace-nowrap text-fg-3">{next.weatherPick} 선택</span>}
            </dd>
            <dt>{editable ? "서브 날씨" : next.sub ? "서브 날씨" : "서브 날씨 후보"}</dt>
            <dd>
              {editable ? (
                <span className="subw" role="group" aria-label="서브 날씨">
                  {SUB_WEATHERS.map((w) => {
                    const used = !next.subRemaining.includes(w) && next.sub !== w;
                    const on = next.sub === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        className={used ? "used" : undefined}
                        aria-pressed={on}
                        title={used ? "이번 4라운드 안에 이미 사용한 날씨" : undefined}
                        onClick={() => run({ op: "set_weather", group: group.idx, round: next.roundNo, sub: on ? null : w })}
                      >
                        {w}
                      </button>
                    );
                  })}
                </span>
              ) : (
                next.sub ?? (next.subRemaining.length ? next.subRemaining.join(", ") : "없음")
              )}
            </dd>
            <dt>금지 실험체</dt>
            <dd className={next.bans.length ? "flex flex-wrap gap-x-2.5 gap-y-1" : undefined}>{next.bans.length ? next.bans.map((b) => <Char key={b} name={b} />) : "없음"}</dd>
            {mode !== "points" && (
              <>
                <dt>체크포인트</dt>
                <dd>{next.checkpoint.length ? `${next.checkpoint.length}팀` : "없음"}</dd>
              </>
            )}
          </dl>
          {editable && !drop && (
            <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 max-[760px]:*:min-h-8">
              <button type="button" className="link" onClick={() => pickFiles(next.roundNo)}>CSV 올리기</button>
              <button type="button" className="link" onClick={() => openManual(next.roundNo)}>직접 입력</button>
            </div>
          )}
        </section>
      )}

      {ended && (
        <section className="panel flex min-w-0 flex-col gap-2 px-3.5 py-3 border-gold max-[760px]:-order-1 max-[760px]:col-span-full" aria-label={multi ? `${group.label}조 경기 종료` : "대회 종료"}>
          <div className="flex min-w-0 items-center gap-2">
            <b className="text-[15px] font-extrabold whitespace-nowrap">{multi ? `${group.label}조 경기 종료` : "대회 종료"}</b>
          </div>
          {result.standings.slice(0, 3).map((s) => (
            <div key={s.key} className="grid grid-cols-[34px_minmax(0,1fr)_auto] gap-2 text-[13px]">
              <span className="text-fg-3">{s.rank}위</span>
              <span className="min-w-0 truncate">{s.name}</span>
              <span className="tabular-nums">{fmt1(s.total)}</span>
            </div>
          ))}
        </section>
      )}

      {!next && !ended && played >= planned && <p className="text-fg-3">정한 라운드를 모두 치렀습니다.</p>}
    </div>
  );
}

function WeatherEdit({ main, sub, onSave, onClose }: { main: string; sub: string | null; onSave: (m: string, s: string | null) => void; onClose: () => void }) {
  const [m, setM] = useState(main);
  const [s, setS] = useState(sub ?? "");
  return (
    <div className="grid gap-1.5 border-t border-line-soft pt-2">
      <select className="field sm" aria-label="메인 날씨" value={m} onChange={(e) => setM(e.target.value)}>
        {MAIN_WEATHERS.map((w) => (
          <option key={w}>{w}</option>
        ))}
      </select>
      <select className="field sm" aria-label="서브 날씨" value={s} onChange={(e) => setS(e.target.value)}>
        <option value="">서브 날씨 없음</option>
        {SUB_WEATHERS.map((w) => (
          <option key={w}>{w}</option>
        ))}
      </select>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn sm" onClick={onClose}>취소</button>
        <button type="button" className="btn sm primary" onClick={() => onSave(m, s || null)}>저장</button>
      </div>
    </div>
  );
}
