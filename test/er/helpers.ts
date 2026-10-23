import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseRoundCsv, type Player } from "../../src/er/lib/parse";
import type { RoundInput } from "../../src/er/lib/engine";
import { KEL_TEAMS } from "../../src/er/lib/kel";

export const HEADER =
  "rank, level, character, nickname, weapon, best weapon mastery, best weapon mastery level, total field kill, team kill, elimination, down can not eliminate, repeat down can not eliminate, down can eliminate, repeat down can eliminate, kill, assist, hunting, killer, gameId, teamName, tournament total score, tournament rank score, tournament kill score";

const RS = [10, 7, 5, 4, 3, 2, 1, 0];

type PlayerSpec = { nick: string; char?: string; kill?: number; hunting?: number; level?: number };

export type TeamSpec = {
  team: string;
  place: number;
  ks: number;
  kills?: number;
  players?: PlayerSpec[];
};

export function csv(gameId: number, teams: TeamSpec[]): string {
  const lines = [HEADER];
  for (const t of teams) {
    const players: PlayerSpec[] = t.players ?? [1, 2, 3].map((i) => ({ nick: `${t.team}-${i}`, char: `${t.team}${i}` }));
    for (const p of players) {
      const total = (RS[t.place - 1] ?? 0) + t.ks;
      lines.push(
        [
          t.place, p.level ?? 18, p.char ?? `${p.nick}-char`, p.nick, "", "Defense", 18, t.kills ?? 0, t.kills ?? 0, 0, 0, 0, 0, 0,
          p.kill ?? 0, 0, p.hunting ?? 40, "", gameId, t.team, total, RS[t.place - 1] ?? 0, t.ks,
        ].join(", "),
      );
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function round(roundNo: number, gameId: number, teams: TeamSpec[]): RoundInput {
  const parsed = parseRoundCsv(csv(gameId, teams));
  if (!parsed.ok) throw new Error(parsed.error);
  return { roundNo, source: "csv", gameId, players: parsed.round.players };
}

export function places(roundNo: number, order: string[], ks: number[] = []): RoundInput {
  return round(
    roundNo,
    1000 + roundNo,
    order.map((team, i) => ({ team, place: i + 1, ks: ks[i] ?? 0 })),
  );
}

export type { Player };

const KEL_HEADER = "매치,날짜,라운드,gameId,순위,팀,선수,실험체,킬,어시,데스,채집,가한피해,받은피해,rankScore,killScore,TS,크레딧,KPR";
const KEL_CHARS = ["Nadine", "Alonso", "Debi & Marlene", "Li Dailin", "NiaH", "Yumin", "Jackie", "Aya", "Eleven"];
// dak.gg 실험체 이름표의 key, 경기 기록의 영문 이름과 표기가 다름
const DAK_KEYS = ["Nadine", "Alonso", "DebiMarlene", "LiDailin", "Niah", "YuMin", "Jackie", "Aya", "Eleven"];

// dak.gg 지역과 날씨 이름표의 일부
const AREAS = [
  { id: 10, name: "항구" },
  { id: 20, name: "창고" },
  { id: 30, name: "연못" },
  { id: 40, name: "바지선" },
];
const WEATHERS = [
  { key: 10001, name: "흐림" },
  { key: 10002, name: "쾌청" },
  { key: 10003, name: "비" },
  { key: 10004, name: "모래바람" },
];

// 첫 게임의 팀 순서-선수 순서별 가한 피해
const LOW_DAMAGE = new Map([
  ["7-0", 281],
  ["7-1", 590],
  ["7-2", 830],
  ["6-0", 892],
  ["6-1", 1024],
]);

// 단계별 경기 날짜는 서킷 첫날부터 센 날수
const DAYS = [0, 0, 1, 7, 7, 8];
const shift = (date: string, days: number) => new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);

// 서킷 최종 순위에 맞춘 단계별 8팀. 1~8위 가운데 홀수 순위는 승자조에서 바로, 짝수 순위는 최종전을 거쳐 결승에 감
function bracket(c: number): [string, string[]][] {
  const byRank = [...KEL_TEAMS].sort((a, b) => a.circuits[c - 1] - b.circuits[c - 1]).map((t) => t.csv);
  const direct = byRank.filter((_, i) => i < 8 && i % 2 === 0);
  const via = byRank.filter((_, i) => i < 8 && i % 2 === 1);
  const nine = byRank.slice(8, 12);
  const upper = [...direct, via[0], via[1], nine[0], nine[1]];
  const lower = [via[2], via[3], nine[2], nine[3], ...byRank.slice(12)];
  return [
    ["Group_A", [...upper.slice(0, 4), ...lower.slice(0, 4)]],
    ["Group_B", [...upper.slice(4), ...lower.slice(4)]],
    ["Upper_Match", upper],
    ["Lower_Match", lower],
    ["Lower_Finals", [...via, ...nine]],
    ["Finals", byRank.slice(0, 8)],
  ];
}

// 실제 경기 기록 대신 지어낸 값으로 KEL CSV를 만듦
export function kelFixture(dataDir: string) {
  const dir = join(dataDir, "kel");
  mkdirSync(dir, { recursive: true });
  const all = KEL_TEAMS.map((t) => t.csv);
  // 서킷 결승에 자주 오른 팀 선수는 30게임을 넘겨 선수끼리 견주는 화면에도 나옴
  const files: [string, string[], number][] = [
    ["2026_KEL_Opening_week_Group_Alpha_2026-05-22.csv", all.slice(0, 8), 4],
    ["2026_KEL_MIDSEASON_CUP_SEMIFINALS_2026-08-01.csv", all.slice(8, 16), 6],
    ...(["2026-06-06", "2026-07-04", "2026-09-12", "2026-10-10"] as const).flatMap((start, i) =>
      bracket(i + 1).map(([stage, teams], k): [string, string[], number] => [`2026_KEL_CIRCUIT_${i + 1}_${stage}_${shift(start, DAYS[k])}.csv`, teams, stage === "Finals" ? (i === 2 ? 8 : 6) : 2]),
    ),
  ];
  const dak = join(dir, "dakgg");
  mkdirSync(join(dak, "games"), { recursive: true });
  writeFileSync(join(dak, "d_characters.json"), JSON.stringify({ characters: DAK_KEYS.map((key, i) => ({ id: i + 1, key })) }));
  writeFileSync(join(dak, "d_areas.json"), JSON.stringify({ areas: AREAS }));
  writeFileSync(join(dak, "d_weathers.json"), JSON.stringify({ weathers: WEATHERS }));
  files.forEach(([name, teams, rounds], f) => {
    const date = name.slice(-14, -4);
    const lines = [KEL_HEADER];
    for (let r = 1; r <= rounds; r++) {
      const gameId = 10_000 + f * 100 + r;
      const players: object[] = [];
      teams.forEach((team, i) => {
        const g = all.indexOf(team);
        const place = ((i + r * 3) % teams.length) + 1;
        const ks = ((r + i) % 5) * 1.5;
        for (let p = 0; p < 3; p++) {
          const c = (i * 3 + p + r) % KEL_CHARS.length;
          // 첫 게임에만 최다 데스와 최저 가한 피해를 따로 두어 낮은 기록 표가 다섯 줄 남짓 나옴
          const first = f === 0 && r === 1;
          const deaths = first && p === 0 && i < 7 ? (i ? 9 : 11) : p % 2;
          const low = first ? LOW_DAMAGE.get(`${i}-${p}`) : undefined;
          lines.push(
            [
              name.slice(0, -15).replace(/_/g, " "), date, r, gameId, place, team, `T${g}_선수${g}-${p}`, KEL_CHARS[c],
              (r + i + p) % 4, (i + p) % 6, deaths, 30 + i, low ?? 9000 + i * 700 + p * 300 + r * 50, 7000 + p * 900 + i * 100, RS[place - 1], ks, RS[place - 1] + ks, 1500 + i, (1 + ((i + p) % 3) / 2).toFixed(3),
            ].join(","),
          );
          // 위클라인은 2위 팀 세 명이 모두 처치 크레딧을 받고, 파일마다 첫 라운드의 3위 팀이 탈출함
          players.push({
            gameId,
            gameRank: place,
            characterNum: c + 1,
            ccTimeToPlayer: 10 + i * 3 + p + r,
            teamRecover: 500 * p + 100 * i,
            protectAbsorb: 50 * r,
            addTelephotoCamera: (i + p + r) % 7,
            viewContribution: 20 + i * 4 + p + r,
            killWicklineGainVFCredit: place === 2 ? 10 : 0,
            playTime: 600 + (8 - place) * 90 + p * 10,
            placeOfStart: String(AREAS[(i + p) % AREAS.length].id),
            placeOfDeath: String(AREAS[(i + r) % AREAS.length].id),
            escapeState: place === 3 && r === 1 ? 3 : 0,
            mainWeather: WEATHERS[r % WEATHERS.length].key,
          });
        }
      });
      writeFileSync(join(dak, "games", `${gameId}.json`), JSON.stringify({ games: players }));
    }
    writeFileSync(join(dir, name), "\ufeff" + lines.join("\n") + "\n");
  });
}
