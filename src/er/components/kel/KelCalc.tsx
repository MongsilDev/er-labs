"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Lines from "@/components/Lines";
import { fmt } from "@/er/lib/format";
import { championshipTeams, FINAL_ROUNDS, SEMI, TEAM, type KelTeam } from "@/er/lib/kel";
import { advanceOdds, certainty, finalState, standings, type Round, type Row } from "@/er/lib/kel-calc";
import { PLACEMENT_POINTS } from "@/er/lib/rules";
import type { CalcData } from "@/er/server/kel";
import Checkpoints from "./Checkpoints";
import { Logo, TeamName } from "./Team";

type Saved = { semi: Round[]; picks: string[]; final: Round[] };
type Tab = "semi" | "final" | "demo";

const KEY = "labs-kel-calc";
const RUNS = 30_000;
const FINAL_DAY = Date.parse("2026-11-08T00:00:00+09:00");
const { seeds: SEEDS, semi: SEMI_TEAMS } = championshipTeams();
const SEED_KEYS = SEEDS.map((t) => t.key);
const SEMI_KEYS = SEMI_TEAMS.map((t) => t.key);
const team = (key: string) => TEAM.get(key)!;

const isCount = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function isRound(r: unknown, teams: string[]): r is Round {
  if (!r || typeof r !== "object") return false;
  const e = r as Record<string, Record<string, unknown>>;
  if (Object.keys(e).length !== teams.length) return false;
  const places = new Set<unknown>();
  for (const k of teams) {
    const x = e[k];
    if (!x || !Number.isInteger(x.placement) || (x.placement as number) < 1 || (x.placement as number) > teams.length) return false;
    if (![x.killScore, x.penalty].every(isCount) || (x.rule !== undefined && !isCount(x.rule))) return false;
    places.add(x.placement);
  }
  return places.size === teams.length;
}

// 잘못된 라운드를 건너뛰면 뒤 라운드 번호가 밀려서 그 뒤를 모두 버림
function leading(list: unknown, ok: (r: unknown) => boolean): Round[] {
  const out: Round[] = [];
  for (const r of Array.isArray(list) ? list : []) {
    if (!ok(r)) break;
    out.push(r as Round);
  }
  return out;
}

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const semi = leading(v.semi, (r) => isRound(r, SEMI_KEYS)).slice(0, SEMI.rounds);
    const picks = [...new Set<string>((Array.isArray(v.picks) ? v.picks : []).filter((k: unknown) => typeof k === "string" && SEMI_KEYS.includes(k)))].slice(0, SEMI.advance);
    const final = (Array.isArray(v.final) ? v.final : []).slice(0, FINAL_ROUNDS);
    return { semi, picks, final };
  } catch {
    return { semi: [], picks: [], final: [] };
  }
}

// 준결승 기록을 고쳐도 저장된 결승 기록이 사라지지 않게 그 기록의 4팀을 씀
function savedFinalists(rounds: Round[]): string[] | null {
  const first: unknown = rounds[0];
  if (!first || typeof first !== "object") return null;
  const semi = Object.keys(first).filter((k) => SEMI_KEYS.includes(k));
  return semi.length === SEMI.advance && isRound(first, [...SEED_KEYS, ...semi]) ? semi : null;
}

function pct(v: number | undefined) {
  if (v === undefined) return "";
  const p = v * 100;
  if (p >= 99.95) return ">99.9%";
  if (p < 0.05) return "<0.1%";
  return `${p.toFixed(1)}%`;
}

function Odds({ value, status }: { value: number | undefined; status: "in" | "out" | undefined }) {
  if (status === "in") return <span className="chip border-accent text-accent">진출 확정</span>;
  if (status === "out") return <span className="chip dashed">탈락 확정</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-24 overflow-hidden rounded-full bg-field max-[760px]:hidden" aria-hidden="true">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${(value ?? 0) * 100}%` }} />
      </span>
      <span className="min-w-[56px] font-semibold">{pct(value)}</span>
    </span>
  );
}

type Col<R> = { head: ReactNode; cell: (r: R) => ReactNode };

function ScoreTable<R extends Row>({ rows, rounds, rank, cols }: { rows: R[]; rounds: number; rank: (r: R, i: number) => string; cols: Col<R>[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="kel-table">
        <thead>
          <tr>
            <th className="l w-10">
              <span className="sr-only">순위</span>
            </th>
            <th className="l">팀</th>
            {Array.from({ length: rounds }, (_, i) => (
              <th key={i} className="wide">
                {i + 1}R
              </th>
            ))}
            <th className="wide">감점</th>
            <th className="wide">킬 점수</th>
            <th>점수</th>
            {cols.map((c, i) => (
              <th key={i} className="l">
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key}>
              <td className="l">
                <span className={rank(r, i)}>{i + 1}</span>
              </td>
              <td className="l max-w-[220px]">
                <TeamName team={team(r.key)} />
              </td>
              {Array.from({ length: rounds }, (_, j) => (
                <td key={j} className="wide text-fg-3">
                  {r.places[j] ? `${r.places[j]}위` : ""}
                </td>
              ))}
              <td className="wide">{r.penalty ? <span className="text-minus">-{fmt(r.penalty)}</span> : ""}</td>
              <td className="wide">{fmt(r.killScore)}</td>
              <td className="font-bold">{fmt(r.total)}</td>
              {cols.map((c, j) => (
                <td key={j} className="l">
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OddsTable({
  rows,
  rounds,
  odds,
  status,
  result,
}: {
  rows: Row[];
  rounds: number;
  odds: Map<string, number> | null;
  status: Map<string, "in" | "out">;
  result?: Set<string>;
}) {
  const cols: Col<Row>[] = [{ head: "결승 진출", cell: (r) => (odds ? <Odds value={odds.get(r.key)} status={status.get(r.key)} /> : null) }];
  if (result) cols.push({ head: "실제", cell: (r) => (result.has(r.key) ? <b>진출</b> : <span className="text-fg-3">탈락</span>) });
  return <ScoreTable rows={rows} rounds={rounds} rank={(_, i) => (i < SEMI.advance ? "rk adv" : "rk")} cols={cols} />;
}

type Field = "killScore" | "penalty" | "rule";
type Draft = Record<string, Record<"placement" | Field, string>>;

// 넓은 화면은 팀과 입력 칸 한 줄, 좁은 화면은 팀 이름 아래 입력 칸
const ROW = {
  3: "grid grid-cols-[minmax(0,1fr)_88px_80px_80px] items-center gap-x-3 max-[760px]:grid-cols-3 max-[760px]:gap-x-2 max-[760px]:gap-y-1.5",
  4: "grid grid-cols-[minmax(0,1fr)_88px_80px_80px_80px] items-center gap-x-3 max-[760px]:grid-cols-4 max-[760px]:gap-x-2 max-[760px]:gap-y-1.5",
};

// 결승은 규정 감점만 체크포인트 유지에 반영하므로 감점을 두 칸으로 나눔
function RoundForm({ teams, roundNo, rule = false, onSave }: { teams: KelTeam[]; roundNo: number; rule?: boolean; onSave: (r: Round) => void }) {
  const fields: Field[] = rule ? ["killScore", "penalty", "rule"] : ["killScore", "penalty"];
  const label: Record<Field, string> = { killScore: "킬 점수", penalty: rule ? "탈락 감점" : "감점", rule: "규정 감점" };
  const [draft, setDraft] = useState<Draft>(() => Object.fromEntries(teams.map((t) => [t.key, { placement: "", killScore: "", penalty: "", rule: "" }])));
  const [error, setError] = useState("");
  const set = (key: string, field: keyof Draft[string], value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));

  function save() {
    const round: Round = {};
    for (const t of teams) {
      const d = draft[t.key];
      const placement = Number(d.placement);
      const [killScore, penalty, ruleCut] = [d.killScore, d.penalty, d.rule].map((v) => (v.trim() === "" ? 0 : Number(v)));
      if (!placement) return setError("모든 팀의 순위를 골라주세요.");
      if (!Number.isInteger(killScore * 2) || killScore < 0 || killScore > 99) return setError(`${t.name}: 킬 점수는 0.5 단위로 입력해주세요.`);
      if (![penalty, ruleCut].every((v) => Number.isFinite(v) && v >= 0 && v <= 99)) return setError(`${t.name}: 감점은 0 이상으로 입력해주세요.`);
      round[t.key] = rule ? { placement, killScore, penalty, rule: ruleCut } : { placement, killScore, penalty };
    }
    if (new Set(Object.values(round).map((e) => e.placement)).size !== teams.length) return setError("두 팀에 같은 순위를 입력했습니다. 순위를 다시 확인해주세요.");
    setError("");
    onSave(round);
  }

  const used = new Map(
    Object.entries(draft)
      .filter(([, d]) => d.placement)
      .map(([k, d]) => [d.placement, k]),
  );
  return (
    <section className="panel p-5 max-[760px]:p-4" aria-labelledby="round-form">
      <h2 id="round-form" className="text-[17px] font-extrabold">
        {roundNo}라운드 결과 넣기
      </h2>
      <div className="mt-3 grid max-w-[720px] text-[14px]" role="group" aria-label={`${roundNo}라운드 결과`}>
        <div className={`${ROW[rule ? 4 : 3]} pb-1.5 text-[12px] font-semibold text-fg-3`} aria-hidden="true">
          <span className="max-[760px]:hidden">팀</span>
          <span>순위</span>
          {fields.map((f) => (
            <span key={f} className="text-right">
              {label[f]}
            </span>
          ))}
        </div>
        {teams.map((t) => (
          <div key={t.key} className={`${ROW[rule ? 4 : 3]} border-t border-line-soft py-2`}>
            <span className="min-w-0 max-[760px]:col-span-full">
              <TeamName team={t} link={false} />
            </span>
            <select className="field mini h-[34px] w-full" aria-label={`${t.name} 순위`} value={draft[t.key].placement} onChange={(e) => set(t.key, "placement", e.target.value)}>
              <option value="">-</option>
              {Array.from({ length: teams.length }, (_, i) => String(i + 1)).map((p) => (
                <option key={p} value={p} disabled={used.has(p) && used.get(p) !== t.key}>
                  {p}위
                </option>
              ))}
            </select>
            {fields.map((f) => (
              <input
                key={f}
                className="field sm w-full px-2 text-right"
                type="number"
                inputMode="decimal"
                min={0}
                step={f === "killScore" ? 0.5 : 1}
                aria-label={`${t.name} ${label[f]}`}
                value={draft[t.key][f]}
                onChange={(e) => set(t.key, f, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-minus">
          {error}
        </p>
      )}
      <button type="button" className="btn primary mt-4" onClick={save}>
        {roundNo}라운드 결과 저장
      </button>
    </section>
  );
}

function Method({ data }: { data: CalcData }) {
  const lines = [
    `게임 점수는 순위 점수와 킬 점수를 더한 값이고, 순위 점수는 1위부터 ${PLACEMENT_POINTS.join(", ")}점입니다.`,
    "남은 라운드의 순위는 8팀이 모두 같은 확률로 나눠 갖는다고 가정합니다.",
    `킬 점수는 2026 시즌 ${data.teamGames.toLocaleString("ko-KR")}개 팀 경기에서 같은 순위 팀이 얻은 킬 점수 가운데 하나를 무작위로 고릅니다.`,
    `남은 라운드를 ${RUNS.toLocaleString("ko-KR")}번 돌려서 상위 ${SEMI.advance}팀에 든 비율을 확률로 보여줍니다.`,
    `진출 확정은 다른 팀이 남은 라운드마다 1위와 시즌 최고 킬 점수인 ${fmt(data.maxKillScore)}점을 얻어도 ${SEMI.advance}위 밖으로 밀리지 않을 때만 표시하고, 앞으로 받을 감점은 넣지 않습니다.`,
    "점수가 같으면 킬 점수가 많은 팀이, 킬 점수도 같으면 마지막 라운드 순위가 높은 팀이 위입니다.",
    "규정집 제9조에는 킬 수로 가린다고 적혀 있지만, 지난 공식 순위표는 킬 점수로 동점을 가렸습니다.",
  ];
  return (
    <section className="panel p-5 max-[760px]:p-4" aria-labelledby="method">
      <h2 id="method" className="text-[17px] font-extrabold">
        계산 방법
      </h2>
      <ul className="mt-2 grid gap-1 text-[14px] text-fg-2">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

function useOdds(teams: string[], rounds: Round[], total: number, data: CalcData, on: boolean) {
  return useMemo(() => {
    const rows = standings(teams, rounds);
    const left = total - rounds.length;
    return { rows, odds: on ? advanceOdds(rows, left, SEMI.advance, data.pool, RUNS) : null, status: certainty(rows, left, SEMI.advance, data.maxKillScore) };
  }, [teams, rounds, total, data, on]);
}

function Semi({ data, rounds, ready, onRounds }: { data: CalcData; rounds: Round[]; ready: boolean; onRounds: (r: Round[]) => void }) {
  const { rows, odds, status } = useOdds(SEMI_KEYS, rounds, SEMI.rounds, data, ready);
  const played = rounds.length;
  return (
    <>
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="semi-table">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="semi-table" className="text-[17px] font-extrabold">
            {played === 0 ? "1라운드 전" : played === SEMI.rounds ? "최종 결과" : `${played}라운드가 끝난 뒤`}
          </h2>
          {played > 0 && (
            <button type="button" className="link" onClick={() => onRounds(rounds.slice(0, -1))}>
              {played}라운드 기록 지우기
            </button>
          )}
        </div>
        <div className="mt-3">
          <OddsTable rows={rows} rounds={SEMI.rounds} odds={odds} status={status} />
        </div>
      </section>
      {played < SEMI.rounds && <RoundForm key={played} teams={SEMI_TEAMS} roundNo={played + 1} onSave={(r) => onRounds([...rounds, r])} />}
      <Method data={data} />
    </>
  );
}

function Final({
  semiRounds,
  picks,
  rounds,
  onPicks,
  onRounds,
}: {
  semiRounds: Round[];
  picks: string[];
  rounds: Round[];
  onPicks: (p: string[]) => void;
  onRounds: (r: Round[]) => void;
}) {
  const semiDone = semiRounds.length === SEMI.rounds;
  const advanced =
    savedFinalists(rounds) ??
    (semiDone
      ? standings(SEMI_KEYS, semiRounds)
          .slice(0, SEMI.advance)
          .map((r) => r.key)
      : picks);
  const teams = [...SEED_KEYS, ...advanced];
  const ready = advanced.length === SEMI.advance;
  const valid = ready ? leading(rounds, (r) => isRound(r, teams)) : [];
  const state = ready ? finalState(teams, valid) : null;
  const locked = semiDone || valid.length > 0;
  const toggle = (key: string) => onPicks(picks.includes(key) ? picks.filter((k) => k !== key) : picks.length < SEMI.advance ? [...picks, key] : picks);

  return (
    <>
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="final-teams">
        <h2 id="final-teams" className="text-[17px] font-extrabold">
          결승 8팀
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SEEDS.map((t) => (
            <span key={t.key} className="chip h-8 gap-2 pl-1">
              <Logo team={t} size={22} />
              {t.name}
            </span>
          ))}
        </div>
        {locked ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {advanced.map((k) => (
              <span key={k} className="chip h-8 gap-2 pl-1">
                <Logo team={team(k)} size={22} />
                {team(k).name}
              </span>
            ))}
          </div>
        ) : (
          <>
            <p className="mt-3 text-[14px] text-fg-2">준결승에서 올라온 4팀을 골라주세요.</p>
            <div className="subw mt-2">
              {SEMI_TEAMS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="inline-flex items-center gap-1.5 pl-1"
                  aria-pressed={picks.includes(t.key)}
                  disabled={!picks.includes(t.key) && picks.length >= SEMI.advance}
                  onClick={() => toggle(t.key)}
                >
                  <Logo team={t} size={18} />
                  {t.name}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {state && (
        <section className="panel p-5 max-[760px]:p-4" aria-labelledby="final-table">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="final-table" className="text-[17px] font-extrabold">
              {state.champion ? "최종 결과" : state.played === 0 ? "1라운드 전" : `${state.played}라운드가 끝난 뒤`}
            </h2>
            {valid.length > 0 && (
              <button type="button" className="link" onClick={() => onRounds(valid.slice(0, -1))}>
                {valid.length}라운드 기록 지우기
              </button>
            )}
          </div>
          {state.champion ? (
            <p className="mt-1 font-semibold">
              {state.champion.round}라운드에서 {team(state.champion.key).name} 우승이 확정됐습니다.
            </p>
          ) : state.next ? (
            <p className="mt-1 text-[14px] text-fg-2">
              {state.next.checkpoint.length
                ? `${state.next.roundNo}라운드는 ${state.next.checkpoint.length}팀이 체크포인트를 받고, ${team(state.next.weather!).name} 팀이 메인 날씨를 고릅니다.`
                : `${state.next.roundNo}라운드는 체크포인트 없이 진행하고, 메인 날씨는 ${state.next.main}입니다.`}
            </p>
          ) : null}
          <div className="mt-3">
            <ScoreTable
              rows={state.rows}
              rounds={Math.max(state.played, 1)}
              rank={(r) => (state.champion?.key === r.key ? "rk first" : "rk")}
              cols={[
                {
                  head: <span className="sr-only">상태</span>,
                  cell: (r) => (state.champion?.key === r.key ? <span className="chip strong">우승</span> : r.checkpoint ? <span className="cp">체크포인트</span> : null),
                },
              ]}
            />
          </div>
        </section>
      )}

      {state?.next && <RoundForm key={state.played} teams={teams.map(team)} roundNo={state.next.roundNo} rule onSave={(r) => onRounds([...valid, r])} />}

      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="final-rules">
        <h2 id="final-rules" className="text-[17px] font-extrabold">
          순차 체크포인트
        </h2>
        <Checkpoints />
        <p className="mt-3 text-[14px] text-fg-2">
          <Lines text="체크포인트를 받은 팀이 그 라운드에서 마지막까지 살아남으면 우승이 확정됩니다. 체크포인트는 직전 라운드까지의 순위로 정하고, 규정 감점으로 순위가 내려가도 유지하는 것으로 계산합니다." />
        </p>
      </section>
    </>
  );
}

const DEMO_STEPS = [4, 5, 6];

function Demo({ data }: { data: CalcData }) {
  const [step, setStep] = useState(4);
  const demo = data.demo!;
  const rounds = useMemo(() => demo.rounds.slice(0, step), [demo, step]);
  const { rows, odds, status } = useOdds(demo.teams, rounds, SEMI.rounds, data, true);
  const cuts = demo.teams.flatMap((k) => {
    const p = rounds.reduce((a, r) => a + (r[k]?.penalty ?? 0), 0);
    return p ? [`${team(k).name}의 감점 ${fmt(p)}점`] : [];
  });
  const result = useMemo(
    () =>
      new Set(
        standings(demo.teams, demo.rounds)
          .slice(0, SEMI.advance)
          .map((r) => r.key),
      ),
    [demo],
  );
  return (
    <>
      <section className="panel p-5 max-[760px]:p-4" aria-labelledby="demo-table">
        <h2 id="demo-table" className="text-[17px] font-extrabold">
          8월 1일 미드 시즌 컵 준결승
        </h2>
        <div className="tabs mt-3" role="tablist" aria-label="라운드">
          {DEMO_STEPS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setStep(s)}>
              {s}라운드 뒤
            </button>
          ))}
        </div>
        <div className="mt-3">
          <OddsTable rows={rows} rounds={step} odds={odds} status={status} result={result} />
        </div>
        {cuts.length > 0 && <p className="mt-3 text-[13px] text-fg-3">{cuts.join(", ")}은 bori.wiki 결과 표 점수와 경기 기록 점수의 차이로 넣었습니다.</p>}
      </section>
      <Method data={data} />
    </>
  );
}

export default function KelCalc({ data }: { data: CalcData }) {
  const [saved, setSaved] = useState<Saved>({ semi: [], picks: [], final: [] });
  const [tab, setTab] = useState<Tab>("semi");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = read();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 수화 뒤에만 읽을 수 있음
    setSaved(s);
    if (Date.now() >= FINAL_DAY || s.final.length > 0) setTab("final");
    setReady(true);
  }, []);

  const update = (next: Partial<Saved>) =>
    setSaved((s) => {
      const v = { ...s, ...next };
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {}
      return v;
    });

  const tabs: [Tab, string][] = [["semi", "11월 7일 준결승"], ["final", "11월 8일 결승"], ...(data.demo ? ([["demo", "지난 경기"]] as [Tab, string][]) : [])];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="경기">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "semi" && <Semi data={data} rounds={saved.semi} ready={ready} onRounds={(semi) => update({ semi })} />}
      {tab === "final" && <Final semiRounds={saved.semi} picks={saved.picks} rounds={saved.final} onPicks={(picks) => update({ picks })} onRounds={(final) => update({ final })} />}
      {tab === "demo" && data.demo && <Demo data={data} />}
    </>
  );
}
