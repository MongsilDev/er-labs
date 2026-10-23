// 서킷 순위는 bori.wiki 대회 결과 표, 배점과 일정은 2026-10-12 시행 규정집 기준

export type KelTeam = { key: string; name: string; csv: string; wiki: string; circuits: [number, number, number, number]; dark?: boolean };

export const KEL_TEAMS: KelTeam[] = [
  { key: "gc-busan-stella", name: "GC 부산 스텔라", csv: "GC Busan Stella", wiki: "GC_BUSAN_Stella", circuits: [3, 3, 1, 11] },
  { key: "daejeon-autoarms", name: "대전 오토암즈", csv: "DAEJEON AutoArms", wiki: "DAEJEON_AutoArms", circuits: [7, 1, 3, 3] },
  { key: "incheon-wave", name: "인천 웨이브", csv: "INCHEON WAVE", wiki: "INCHEON_WAVE", circuits: [13, 7, 4, 1] },
  { key: "gyeongbuk-ascenders", name: "경북 어센더스", csv: "Gyeongbuk Ascenders", wiki: "GyeongBuk_Ascenders", circuits: [1, 5, 9, 7] },
  { key: "gyeongnam-sparkle", name: "경남 스파클", csv: "Gyeongnam Sparkle Esports", wiki: "Gyeongnam_Sparkle", circuits: [4, 6, 10, 2] },
  { key: "seongnam-rox", name: "성남 락스", csv: "Seongnam ROX", wiki: "Seongnam_ROX", circuits: [10, 2, 6, 5] },
  { key: "chungnam-cnj", name: "충남 CNJ", csv: "Chungnam CNJ Esports", wiki: "Chungnam_CNJ", circuits: [9, 10, 2, 9] },
  { key: "new-rise-gangwon", name: "뉴 라이즈 강원", csv: "New Rise Gangwon", wiki: "New_Rise_Gangwon", circuits: [5, 14, 8, 4] },
  { key: "jeonnam-esports", name: "전남 이스포츠", csv: "Jeonnam Esports", wiki: "JEONNAM_ESPORTS", circuits: [16, 4, 5, 12] },
  { key: "daegu-guardians", name: "대구 가디언즈", csv: "Daegu Guardians", wiki: "Daegu_Guardians", circuits: [2, 9, 16, 13] },
  { key: "fn-sejong", name: "FN 세종", csv: "FN SEJONG", wiki: "FN_SEJONG", circuits: [11, 12, 12, 6], dark: true },
  { key: "gyeonggi-innate", name: "경기 이네이트", csv: "Gyeonggi Innate", wiki: "Gyeonggi_Innate", circuits: [8, 8, 7, 16] },
  { key: "gj-slasher", name: "광주 슬래셔", csv: "GJ Slasher", wiki: "GJ_Slasher", circuits: [6, 15, 15, 10] },
  { key: "yj-whales", name: "양주 웨일즈", csv: "YJ Whales", wiki: "Yangju_Whales", circuits: [14, 13, 14, 8] },
  { key: "jeju-shadow", name: "제주 쉐도우", csv: "Jeju Shadow", wiki: "Jeju_Shadow", circuits: [15, 11, 11, 14] },
  { key: "goyang-mir", name: "고양 미르", csv: "Goyang Mir", wiki: "Goyang_MIR", circuits: [12, 16, 13, 15] },
];

export const TEAM = new Map(KEL_TEAMS.map((t) => [t.key, t]));
export const TEAM_BY_CSV = new Map(KEL_TEAMS.map((t) => [t.csv, t]));

export const WIKI = "https://bori.wiki";
export const LOGO_CDN = "https://cdn.mongsil.dev/er-labs/teams";

export const wikiUrl = (title: string) => `${WIKI}/${encodeURIComponent(title.replace(/ /g, "_"))}`;

// 차트 강조 3색, 값은 globals.css의 --kel-1~3
export const TONES = ["var(--kel-1)", "var(--kel-2)", "var(--kel-3)"];

// 영문과 숫자는 읽는 소리의 받침으로 고름
export function josa(word: string, withFinal: string, without: string): string {
  const c = word.trim().slice(-1);
  const code = c.charCodeAt(0) - 0xac00;
  const final = code >= 0 && code <= 11171 ? code % 28 !== 0 : /[lmnr013678]/i.test(c);
  return word + (final ? withFinal : without);
}

// 마지막 칸은 9~12위 공통, 13위부터 0점
export const CIRCUIT_POINTS: Record<"early" | "late", number[]> = { early: [800, 480, 320, 240, 200, 160, 120, 80, 40], late: [1200, 720, 480, 360, 300, 240, 180, 120, 60] };

export function circuitPoints(circuit: number, rank: number): number {
  const table = circuit <= 2 ? CIRCUIT_POINTS.early : CIRCUIT_POINTS.late;
  if (rank <= 8) return table[rank - 1];
  return rank <= 12 ? table[8] : 0;
}

export type SeasonRow = { team: KelTeam; points: number[]; total: number; rank: number };

// 포인트가 같으면 서킷 4 순위가 높은 팀이 위
export function seasonStandings(): SeasonRow[] {
  return KEL_TEAMS.map((team) => {
    const points = team.circuits.map((rank, i) => circuitPoints(i + 1, rank));
    return { team, points, total: points.reduce((a, b) => a + b, 0), rank: 0 };
  })
    .sort((a, b) => b.total - a.total || a.team.circuits[3] - b.team.circuits[3])
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export const FINAL_ROUNDS = 9;

export function championshipTeams() {
  const season = seasonStandings();
  return { seeds: season.slice(0, 4).map((r) => r.team), semi: season.slice(4, 12).map((r) => r.team) };
}

export const KEL_EVENTS = [
  { key: "opening", name: "오프닝 위크", dates: "5.22~5.23" },
  { key: "c1", name: "서킷 1", dates: "6.6~6.14" },
  { key: "c2", name: "서킷 2", dates: "7.4~7.12" },
  { key: "msc", name: "미드 시즌 컵", dates: "8.1~8.2" },
  { key: "c3", name: "서킷 3", dates: "9.12~9.20" },
  { key: "c4", name: "서킷 4", dates: "10.10~10.18" },
] as const;

export type KelEvent = (typeof KEL_EVENTS)[number]["key"];
export const EVENT_NAME = Object.fromEntries(KEL_EVENTS.map((e) => [e.key, e.name])) as Record<KelEvent, string>;

export type KelScreen = "home" | "rules" | "circuits" | "finals" | "teams" | "players" | "roles" | "characters" | "comps" | "records";

// public이 false인 화면은 KEL_OWNER_ID 계정만 열 수 있음
export const KEL_SCREENS: Record<KelScreen, { path: string; title: string; public: boolean }> = {
  home: { path: "/er/kel", title: "2026 KEL 기록", public: false },
  rules: { path: "/er/kel/rules", title: "포맷과 규칙", public: false },
  circuits: { path: "/er/kel/circuits", title: "서킷별 순위", public: false },
  finals: { path: "/er/kel/finals", title: "결승 점수 흐름", public: false },
  teams: { path: "/er/kel/teams", title: "팀 성향", public: false },
  players: { path: "/er/kel/players", title: "선수 카드", public: false },
  roles: { path: "/er/kel/roles", title: "팀 안에서 맡은 역할", public: false },
  characters: { path: "/er/kel/characters", title: "실험체 선택률", public: false },
  comps: { path: "/er/kel/comps", title: "자주 나온 3인 조합", public: false },
  records: { path: "/er/kel/records", title: "한 게임 기록", public: false },
};

// 팀별 조합처럼 결승 뒤에 공개하기로 한 항목
export const AFTER_FINAL = Date.parse("2026-11-09T00:00:00+09:00");
