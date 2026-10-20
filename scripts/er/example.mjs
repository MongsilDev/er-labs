// 예시 대회 데이터. 2026 KEL 서킷 4 결승(2026-10-18) 실제 기록을 dak.gg 대회 API에서 받아 CSV에 담기는 값만 남김
// 감점 두 건은 경기 기록과 공식 순위표(bori.wiki)의 3라운드 점수 차이
import { writeFileSync } from "node:fs";

const API = "https://er.dakgg.io/api/v1";
const FINALS = [8104, 8105, 8106, 8107, 8108, 8109, 8110, 8111];
const TEAMS = {
  INW: "인천 웨이브",
  GNS: "경남 스파클",
  DTS: "대전 오토암즈",
  NRG: "뉴 라이즈 강원",
  ROX: "성남 락스",
  FN: "FN 세종",
  GBA: "경북 어센더스",
  YJS: "양주 웨일즈",
};

const get = async (path) => {
  const res = await fetch(API + path, { headers: { "User-Agent": "er-labs example builder" } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const characters = new Map((await get("/data/characters?hl=en")).characters.map((c) => [c.id, c.key]));
const weatherName = new Map((await get("/data/weathers?hl=ko")).weathers.map((w) => [w.key, w.name === "안개" ? "자색안개" : w.name]));

const rounds = [];
const weather = [];
for (const [i, id] of FINALS.entries()) {
  const roundNo = i + 1;
  const game = await get(`/tournament/games?id=${id}`);
  const score = new Map(game.scoreInfos.map((s) => [s.teamNumber, s]));
  const players = game.games
    .map((p) => {
      const tag = p.nickname.split("_")[0];
      const team = TEAMS[tag];
      if (!team) throw new Error(`TEAMS에 없는 팀 ${p.nickname}`);
      const s = score.get(p.teamNumber);
      return {
        nickname: p.nickname,
        character: characters.get(p.characterNum) ?? String(p.characterNum),
        team,
        placement: p.gameRank,
        totalScore: s.rankScore + s.killScore,
        killScore: s.killScore,
        kills: p.playerKill,
        teamKills: p.teamKill,
        hunting: p.monsterKill,
        level: p.characterLevel,
      };
    })
    .sort((a, b) => a.placement - b.placement || a.nickname.localeCompare(b.nickname));
  rounds.push({ id: 100 + roundNo, roundNo, source: "csv", gameId: null, fileName: `round${roundNo}.csv`, players });
  const first = game.games[0];
  weather.push({ roundNo, main: weatherName.get(first.mainWeather) ?? null, sub: weatherName.get(first.subWeather) ?? null });
  await sleep(800);
}

const view = {
  code: "EXAMPLE",
  name: "2026 KEL 서킷 4 결승",
  mode: "checkpoint",
  plannedRounds: 12,
  groupCount: 1,
  version: 1,
  updatedAt: 0,
  expiresAt: 0,
  role: null,
  example: true,
  source: { name: "dak.gg", url: "https://dak.gg/er/esports/kel_2026?sub=circuit_4&major=preliminary_round" },
  logs: null,
  groups: [
    {
      idx: 0,
      label: "A",
      rounds,
      penalties: [
        { id: 1, team: TEAMS.GNS, roundNo: 3, kind: "rule", count: 1, points: 1, reason: "공식 집계 차감" },
        { id: 2, team: TEAMS.NRG, roundNo: 3, kind: "rule", count: 1, points: 1, reason: "공식 집계 차감" },
      ],
      weather,
      aliases: {},
      overrides: {},
    },
  ],
};
writeFileSync(new URL("../../src/er/data/example.json", import.meta.url), JSON.stringify(view));
console.log("예시 대회", rounds.length, "라운드", rounds.reduce((n, r) => n + r.players.length, 0), "명");
