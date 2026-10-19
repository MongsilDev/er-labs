"use client";

import { useState } from "react";
import type { GroupResult } from "@/lib/engine";
import { characterName, fmt } from "@/lib/format";
import type { Rules } from "@/lib/rules";

type Tab = "rounds" | "picks" | "players";

export default function Details({ result, rules }: { result: GroupResult; rules: Rules }) {
  const [tab, setTab] = useState<Tab>("rounds");
  const { standings, played, picks, players } = result;
  if (played === 0) return null;
  const tabs: [Tab, string][] = [
    ["rounds", "라운드별 점수"],
    ["picks", "실험체 선택"],
    ["players", "선수 기록"],
  ];
  return (
    <div className="details">
      <div className="tabs" role="tablist" aria-label="상세 기록">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="panel scroll-x">
        {tab === "rounds" && (
          <table className="rt">
            <thead>
              <tr>
                <th scope="col" rowSpan={2} className="l sticky">팀</th>
                {Array.from({ length: played }, (_, i) => (
                  <th key={i} scope="colgroup" colSpan={3} className="rs">
                    {i + 1}라운드
                  </th>
                ))}
                <th scope="col" rowSpan={2} className="rs">감점</th>
                <th scope="col" rowSpan={2} className="rs sticky-r">총점</th>
              </tr>
              <tr>
                {Array.from({ length: played }, (_, i) => [
                  <th key={`p${i}`} scope="col" className="rs">순위</th>,
                  <th key={`k${i}`} scope="col">킬 점수</th>,
                  <th key={`s${i}`} scope="col">점수</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.key}>
                  <th scope="row" className="l sticky">{s.name}</th>
                  {s.rounds.slice(0, played).map((r, i) => [
                    <td key={`p${i}`} className={r?.placement === 1 ? "rs win" : "rs"}>{r?.placement ?? "-"}</td>,
                    <td key={`k${i}`}>{r ? fmt(r.killScore) : "-"}</td>,
                    <td key={`s${i}`}>{r ? fmt(r.score) : "-"}</td>,
                  ])}
                  <td className="rs minus">{s.penalty > 0 ? `-${fmt(s.penalty)}` : ""}</td>
                  <td className="rs strong sticky-r">{fmt(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === "picks" &&
          (picks.length === 0 ? (
            <p className="muted pad">CSV로 올린 라운드가 없어 실험체 기록이 없습니다.</p>
          ) : (
            <div className="picks">
              {picks.map((p) => (
                <section key={p.roundNo} aria-label={`${p.roundNo}라운드 실험체`}>
                  <h3>{p.roundNo}라운드</h3>
                  <ul>
                    {p.counts.filter((c) => c.count >= 2 || c.banRounds > 0).length === 0 && <li className="muted">2명 이상 고른 실험체 없음</li>}
                    {p.counts
                      .filter((c) => c.count >= 2 || c.banRounds > 0)
                      .map((c) => (
                        <li key={c.character}>
                          <span>{characterName(c.character)}</span>
                          <span className="muted">{c.count}명</span>
                          {c.banRounds > 0 && rules.bans && (
                            <span className="ban">
                              {c.banRounds === 1 ? `${p.roundNo + 1}라운드 금지` : `${p.roundNo + 1}~${p.roundNo + c.banRounds}라운드 금지`}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          ))}
        {tab === "players" &&
          (players.kills.length === 0 ? (
            <p className="muted pad">CSV로 올린 라운드가 없어 선수 기록이 없습니다.</p>
          ) : (
            <div className="pstats">
              {(
                [
                  ["라운드당 킬", players.kills],
                  ["라운드당 사냥", players.hunting],
                  ["라운드당 평균 레벨", players.level],
                ] as const
              ).map(([title, list]) => (
                <section key={title} aria-label={title}>
                  <h3>{title}</h3>
                  <ol>
                    {list.map((p) => (
                      <li key={p.nickname + p.team}>
                        <span className="rk-s">{p.rank}</span>
                        <span className="ellipsis">
                          <b>{p.nickname}</b> <span className="muted">{p.team}</span>
                        </span>
                        <span className="num strong">{fmt(p.value)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
