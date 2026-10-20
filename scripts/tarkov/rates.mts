// 비교군 계정 전체에 판정을 돌려 배지별 비율(BADGE_RATES)을 계산. 1분 남짓 걸림
// 운영 DB를 직접 열지 않고 컨테이너 안에서 VACUUM INTO로 만든 사본을 docker cp로 꺼내 씀
// 사용: node scripts/tarkov/rates.mts <DB 사본 경로>
import { DatabaseSync } from "node:sqlite";
import { combine, judge, MIN_N, TARGET_PEERS, WIDTHS, type Sample, type VerdictPart } from "../../src/tarkov/lib/criteria.ts";

type Row = Sample & { aid: number };
const d = new DatabaseSync(process.argv[2], { readOnly: true });
const cols = "aid, hours, n, kills, deaths, survived, streak, headshots, max_game_kills AS maxGameKills";
const q = d.prepare(`SELECT ${cols} FROM baseline WHERE mode = ? AND aid != ? AND n > 0 AND hours BETWEEN ? AND ? AND n BETWEEN ? AND ? LIMIT 2000`);

// src/tarkov/server/baseline.ts의 peers와 같은 범위 넓히기
function peers(key: string, s: Row) {
  let last: Sample[] = [];
  for (const w of WIDTHS) {
    last = q.all(key, s.aid, s.hours * (1 - w), s.hours * (1 + w), Math.floor(s.n * (1 - w)), Math.ceil(s.n * (1 + w))) as Sample[];
    if (last.length >= TARGET_PEERS) return { rows: last, width: w };
  }
  return { rows: last, width: WIDTHS[WIDTHS.length - 1] };
}

function tally(states: string[]) {
  const c: Record<string, number> = { clear: 0, warn: 0, alert: 0, none: 0 };
  for (const s of states) c[s]++;
  const judged = c.clear + c.warn + c.alert;
  const r = (k: string) => Math.round((c[k] / judged) * 1000) / 10;
  return { accounts: judged, clear: r("clear"), warn: r("warn"), alert: r("alert") };
}

const out: Record<string, ReturnType<typeof tally>> = {};
for (const mode of ["pvp", "season", "pve"]) {
  const rows = d.prepare(`SELECT ${cols} FROM baseline WHERE mode = ? AND n > 0`).all(mode) as Row[];
  out[mode] = tally(rows.map((s) => { const p = peers(mode, s); return judge("eft", s, p.rows, p.width).state; }));
}
const byAid = new Map<number, VerdictPart[]>();
const keys = (d.prepare(`SELECT DISTINCT mode FROM baseline WHERE mode LIKE 'arena/%' AND mode != 'arena/-'`).all() as { mode: string }[]).map((r) => r.mode);
for (const key of keys) {
  for (const s of d.prepare(`SELECT ${cols} FROM baseline WHERE mode = ? AND n >= ?`).all(key, MIN_N) as Row[]) {
    const p = peers(key, s);
    const part = { key, games: s.n, v: judge("arena", s, p.rows, p.width) };
    byAid.set(s.aid, [...(byAid.get(s.aid) ?? []), part]);
  }
}
out.arena = tally([...byAid.values()].map((parts) => combine(parts).state));
console.log(JSON.stringify(out, null, 1));
