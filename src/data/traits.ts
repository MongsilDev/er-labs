export type TraitCategory = "global" | "positive" | "negative";

export interface Trait {
  id: string;
  name: string;
  effect: string;
  icon: string;
  points?: number; // 긍정: 음수(소모) · 부정: 양수(획득) · 글로벌: 없음
  note?: string; // 카드에 강조 표시할 특이사항
}

export const GLOBAL: Trait[] = [
  { id: "no-insurance", name: "보험 없음", icon: "shield", effect: "레이드 전에 아이템 보험을 들 수 없음" },
  { id: "black-division", name: "블랙 디비전", icon: "target", effect: "특정 지역에 블랙 디비전 요원이 등장" },
  { id: "no-fir-hideout", name: "인레이드 면제", icon: "box", effect: "은신처 제작에 레이드 획득 표식 불필요" },
  { id: "armor-shortage", name: "방어구 부족", icon: "shield", effect: "상인들이 방어구 부족을 겪는 중" },
  { id: "handyman", name: "손재주", icon: "tool", effect: "제작 시간 50% 단축 · 제작 스킬 레벨 51 시작" },
  { id: "seasoned-pmc", name: "숙련된 PMC", icon: "user", effect: "레이드 경험치를 25% 더 획득" },
];

export const POSITIVE: Trait[] = [
  { id: "marathon", name: "마라톤", points: -3, icon: "bolt", effect: "팔·다리 스태미나 소모 15% 감소" },
  { id: "safecracker", name: "금고털이", points: -6, icon: "key", effect: "기계식 열쇠 사용 시 20% 확률로 내구도 유지" },
  { id: "bushborne", name: "수풀 적응", points: -5, icon: "leaf", effect: "수풀에서 이동할 때 소음·감속 50% 감소" },
  { id: "juice-time", name: "쥬스 타임", points: -2, icon: "drop", effect: "쥬스를 마시면 60초간 진통제 효과" },
  { id: "sailors-nostalgia", name: "뱃사람의 추억", points: -2, icon: "drop", effect: "통조림 생선을 먹으면 10초간 체력 재생 +2" },
  { id: "youth", name: "젊음", points: -3, icon: "bolt", effect: "에너지 소모 20% 감소 · 팔·다리 스태미너 +10" },
  { id: "street-tax", name: "보호비", points: -1, icon: "coin", effect: "주 1회 스캐브가 상납금을 지불" },
  { id: "tarkov-shooter", name: "타르코프 슈터", points: -3, icon: "target", effect: "볼트액션 소총 숙련 2배 · 레벨 10 시작" },
  { id: "diet", name: "다이어트", points: -1, icon: "drop", effect: "모든 식량의 자원 소모 50% 감소" },
  { id: "hercules", name: "헤라클레스", points: -3, icon: "dumbbell", effect: "근력·지구력 스킬 레벨 15 시작" },
  { id: "sprinter", name: "질주", points: -2, icon: "bolt", effect: "달리기 속도 5% 증가" },
  { id: "thrombophilia", name: "출혈 둔화", points: -2, icon: "drop", effect: "출혈 발생 확률 25% 감소" },
  { id: "hypodipsia", name: "갈증 둔화", points: -2, icon: "drop", effect: "수분 소모 15% 감소" },
  { id: "polyphagia", name: "배부름", points: -2, icon: "bolt", effect: "에너지 소모 15% 감소" },
  { id: "sturdy-bones", name: "튼튼한 뼈", points: -3, icon: "bone", effect: "사지 골절·낙하 피해 15% 감소" },
  { id: "average", name: "평균치", points: -10, icon: "user", effect: "모든 스킬 레벨 25 시작 · 더 이상 상승 불가" },
  { id: "kappa-protocol", name: "카파 프로토콜", points: -21, icon: "box", effect: "카파 보안 컨테이너 즉시 획득" },
];

// 상호 배타(동시 선택 불가) 쌍 — 같은 스탯을 정반대로 미는 조합.
// ⚠️ 공식 정보가 아님. tarkov-modifier-selector(njmg1) 기준이며, 마지막 항목은 특히 추정.
export const CONFLICTS: [string, string][] = [
  ["thrombophilia", "hemophilia"], // 출혈 발생 확률
  ["sturdy-bones", "osteoporosis"], // 사지 골절·낙하 피해
  ["hypodipsia", "polydipsia"], // 수분 소모
  ["polyphagia", "chronic-fatigue"], // 에너지 소모
  ["youth", "chronic-fatigue"], // 에너지 소모
  ["youth", "exhaustion"], // 팔·다리 스태미너
  ["average", "incompetent"], // 스킬 레벨 상한 (추정)
];

// id → 충돌하는 id 목록 (양방향)
export const conflictMap: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  for (const [a, b] of CONFLICTS) {
    (m[a] ??= []).push(b);
    (m[b] ??= []).push(a);
  }
  return m;
})();

export const NEGATIVE: Trait[] = [
  { id: "hemophilia", name: "출혈 과다", points: 2, icon: "drop", effect: "출혈 발생 확률 25% 증가" },
  { id: "osteoporosis", name: "골다공증", points: 3, icon: "bone", effect: "사지 골절·낙하 피해 15% 증가" },
  { id: "exhaustion", name: "탈진", points: 4, icon: "bolt", effect: "팔·다리 스태미너 회복 15% 감소 · 팔·다리 스태미너 −10" },
  { id: "well-that-hurt", name: "어이쿠, 아파!", points: 2, icon: "cross", effect: "의료 키트 사용 시 자원 25% 더 소모" },
  { id: "incompetent", name: "무능한", points: 4, icon: "user", effect: "스킬 숙련 25% 감소 (볼트액션 제외) · 레벨 30 상한 (크래프팅 제외)" },
  { id: "polydipsia", name: "갈증 과다", points: 1, icon: "drop", effect: "수분 소모 15% 증가" },
  { id: "chronic-fatigue", name: "만성피로", points: 1, icon: "bolt", effect: "에너지 소모 15% 증가" },
  { id: "personality-vacuum", name: "매력 없음", points: 2, icon: "coin", effect: "카리스마 상승 불가 · 상인가 20% 증가", note: "카파 획득 가능" },
  { id: "dr-jekyll", name: "지킬 박사", points: 1, icon: "cross", effect: "새 상처 상태가 레이드 종료까지 유지" },
  { id: "allergic", name: "알레르기", points: 3, icon: "leaf", effect: "식량·의약품 중 무작위 2종에 알레르기" },
  { id: "broken-container", name: "고장난 보안 컨테이너", points: 4, icon: "box", effect: "현금·열쇠·인식표·특수장비·일부 케이스만 수납 가능" },
  { id: "no-flea", name: "플리마켓 금지", points: 6, icon: "coin", effect: "플리마켓에서 플레이어 거래 불가" },
  { id: "third-leg", name: "지팡이 신세", points: 1, icon: "user", effect: "이동 속도 1% 감소 · 테라피스트 상점 5% 할인" },
];
