"use client";

import { useState } from "react";
import type { GroupResult } from "@/lib/engine";
import { characterName, rampColor } from "@/lib/format";
import { MAIN_WEATHERS, SUB_WEATHERS, type Mode } from "@/lib/rules";
import type { GroupView, Op } from "@/lib/view";

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

  return (
    <div className="rounds">
      {rounds.map((r) => {
        const row = rows.get(r.roundNo);
        return (
          <section key={r.roundNo} className="panel slot" aria-label={`${r.roundNo}라운드`}>
            <div className="slot-hd">
              <span className="sw" style={{ background: rampColor(r.roundNo - 1, played) }} />
              <b>{r.roundNo}라운드</b>
              {r.source === "manual" ? <span className="chip dashed">직접 입력</span> : <span className="gid muted">{r.gameId}</span>}
            </div>
            {row ? (
              <>
                <div className="wx">
                  <span className="chip">{r.main}</span>
                  {r.sub && <span className="chip">{r.sub}</span>}
                </div>
                {r.winner && (
                  <div className="slot-kv">
                    <span className="muted">1위</span>
                    <span className="ellipsis">{r.winner}</span>
                  </div>
                )}
                {editable && (
                  <div className="slot-acts">
                    <button type="button" className="link" onClick={() => setWeatherFor(r.roundNo)}>날씨</button>
                    <button type="button" className="link" onClick={() => pickFiles(r.roundNo)}>CSV 교체</button>
                    <button type="button" className="link" onClick={() => openManual(r.roundNo)}>직접 입력</button>
                    <button type="button" className="link danger" onClick={() => run({ op: "delete_round", id: row.id })}>삭제</button>
                  </div>
                )}
              </>
            ) : (
              <div className="muted slot-missing">
                기록 없음
                {editable && (
                  <div className="slot-acts">
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
        <section className="panel slot next" aria-label={`${next.roundNo}라운드 다음 경기`}>
          <div className="slot-hd">
            <span className="sw" style={{ background: "var(--line)" }} />
            <b>{next.roundNo}라운드</b>
            <span className="chip strong">다음 경기</span>
          </div>
          <dl className="kv">
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
                        title={used ? "이번 4라운드 안에 이미 나온 날씨" : undefined}
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
            <dd>{next.bans.length ? next.bans.map(characterName).join(", ") : "없음"}</dd>
            {mode !== "points" && (
              <>
                <dt>체크포인트</dt>
                <dd>{next.checkpoint.length ? `${next.checkpoint.length}팀` : "없음"}</dd>
              </>
            )}
          </dl>
          {editable && (
            <div className="slot-acts">
              <button type="button" className="link" onClick={() => pickFiles(next.roundNo)}>CSV 올리기</button>
              <button type="button" className="link" onClick={() => openManual(next.roundNo)}>직접 입력</button>
            </div>
          )}
        </section>
      )}

      {ended && (
        <section className="panel slot next done" aria-label={multi ? `${group.label}조 경기 종료` : "대회 종료"}>
          <div className="slot-hd">
            <b>{multi ? `${group.label}조 경기 종료` : "대회 종료"}</b>
          </div>
          <div className="slot-kv">
            <span className="muted">1위</span>
            <span className="ellipsis">{result.standings[0]?.name}</span>
          </div>
          {mode === "double" && result.standings[1] && (
            <div className="slot-kv">
              <span className="muted">2위</span>
              <span className="ellipsis">{result.standings[1].name}</span>
            </div>
          )}
        </section>
      )}

      {!next && !ended && played >= planned && <p className="muted">정한 라운드를 모두 치렀습니다.</p>}
    </div>
  );
}

function WeatherEdit({ main, sub, onSave, onClose }: { main: string; sub: string | null; onSave: (m: string, s: string | null) => void; onClose: () => void }) {
  const [m, setM] = useState(main);
  const [s, setS] = useState(sub ?? "");
  return (
    <div className="weather-edit">
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
      <div className="row-acts">
        <button type="button" className="btn sm" onClick={onClose}>취소</button>
        <button type="button" className="btn sm primary" onClick={() => onSave(m, s || null)}>저장</button>
      </div>
    </div>
  );
}
