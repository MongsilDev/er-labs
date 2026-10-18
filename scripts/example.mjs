// 예시 대회 데이터. 팀 이름은 KEL 2026 이터널 리턴 팀, 점수와 닉네임은 가상
import { readFileSync, writeFileSync } from "node:fs";

let seed = 20261019;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rand() * a.length)];
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

const teams = shuffle([
  "GC 부산 스텔라", "대구 가디언즈", "인천 웨이브", "광주 슬래셔", "대전 오토암즈", "FN 세종", "경기 이네이트", "뉴 라이즈 강원",
  "충남 CNJ", "전남 이스포츠", "경북 어센더스", "경남 스파클 이스포츠", "제주 쉐도우", "고양 미르", "성남 락스", "양주 웨일즈",
]);
const words = shuffle(
  "하늘곰 바람새 은빛늑대 새벽별 고요한숲 푸른달 작은불꽃 겨울나무 모래시계 파도소리 붉은여우 밤하늘 초록잎 구름다리 별빛길 눈송이 흰고래 노을빛 단풍잎 햇살 번개구름 안개꽃 돌멩이 물방울 산들바람 종이배 연필깎이 지우개 우산 등대지기 나침반 풍차 시계탑 호숫가 언덕길 갈대숲 반딧불 해바라기 민들레 도토리 솔방울 수정구슬 거울 깃털 조약돌 실타래 꽃잎 은하수".split(" "),
);
const characters = Object.keys(JSON.parse(readFileSync(new URL("../src/data/characters.json", import.meta.url))));
const popular = characters.slice(0, 40);
const RS = [10, 7, 5, 4, 3, 2, 1, 0];

function group(idx, names, played) {
  const roster = names.map((n, i) => ({ team: n, players: [0, 1, 2].map((j) => words[idx * 24 + i * 3 + j]) }));
  const rounds = [];
  for (let r = 1; r <= played; r++) {
    const order = shuffle(roster);
    const players = [];
    const gameId = 66700000 + idx * 1000 + r * 37;
    const hot = pick(popular);
    order.forEach((t, k) => {
      const place = k + 1;
      const ks = Math.max(0, Math.round((11 - place * 1.1 + gauss() * 3.5) * 2) / 2);
      const teamKills = Math.round(ks * 1.25);
      t.players.forEach((nick, j) => {
        const character = r === 2 && k < 3 && j === 0 ? hot : pick(popular);
        players.push({
          nickname: nick,
          character,
          team: t.team,
          placement: place,
          totalScore: RS[place - 1] + ks,
          killScore: ks,
          kills: Math.max(0, Math.round(teamKills / 3 + gauss())),
          teamKills,
          hunting: 30 + Math.round(rand() * 60),
          level: place < 5 ? 16 + Math.round(rand() * 4) : 12 + Math.round(rand() * 4),
        });
      });
    });
    rounds.push({ id: idx * 100 + r, roundNo: r, source: "csv", gameId, fileName: `round${r}.csv`, players });
  }
  return rounds;
}

const A = group(0, teams.slice(0, 8), 3);
const B = group(1, teams.slice(8), 4);
const view = {
  code: "EXAMPLE",
  name: "예시 대회",
  mode: "points",
  plannedRounds: 4,
  groupCount: 2,
  version: 1,
  updatedAt: 0,
  expiresAt: 0,
  role: null,
  example: true,
  logs: null,
  groups: [
    {
      idx: 0,
      label: "A",
      rounds: A,
      penalties: [
        { id: 1, team: A[1].players[6].team, roundNo: 2, kind: "death", count: 1, points: 1, reason: "처치자 불명 사망" },
        { id: 2, team: A[2].players[12].team, roundNo: 3, kind: "rule", count: 1, points: 5, reason: "지각" },
      ],
      weather: [
        { roundNo: 1, main: null, sub: "벼락" },
        { roundNo: 2, main: null, sub: "무풍" },
        { roundNo: 3, main: null, sub: "강풍" },
      ],
      aliases: {},
      overrides: {},
    },
    {
      idx: 1,
      label: "B",
      rounds: B,
      penalties: [],
      weather: [
        { roundNo: 1, main: null, sub: "강풍" },
        { roundNo: 2, main: null, sub: "자색안개" },
        { roundNo: 3, main: null, sub: "무풍" },
        { roundNo: 4, main: null, sub: "벼락" },
      ],
      aliases: {},
      overrides: {},
    },
  ],
};
writeFileSync(new URL("../src/data/example.json", import.meta.url), JSON.stringify(view));
console.log("예시 대회", A.length, B.length);
