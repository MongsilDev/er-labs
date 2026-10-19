import { FLAGS } from "./summary";

const ARENA: Record<string, string> = {
  LastHero: "라스트 히어로",
  CheckPoint: "체크포인트",
  TeamFight: "팀 파이트",
  ShootOutDuo: "슛아웃 듀오",
  ShootOutSolo: "슛아웃",
  ShootOut: "슛아웃",
  BlastGang: "블라스트 갱",
};

export function arenaModeLabel(key: string): string {
  const ranked = key.startsWith("Ranked");
  const base = key.replace(/^(Unranked|Ranked)/, "");
  return `${ARENA[base] ?? base}${ranked ? " 랭크" : ""}`;
}

export function memberChips(member: number): { label: string; official: boolean }[] {
  const out: { label: string; official: boolean }[] = [];
  if (member & FLAGS.developer) out.push({ label: "개발자", official: true });
  if (member & FLAGS.sherpa) out.push({ label: "셰르파", official: true });
  if (member & FLAGS.emissary) out.push({ label: "특사", official: true });
  if (member & FLAGS.moderator) out.push({ label: "채팅 관리자", official: true });
  if (member & FLAGS.unheard) out.push({ label: "Unheard", official: false });
  else if (member & FLAGS.eod) out.push({ label: "EOD", official: false });
  return out;
}

export const sideLabel = (side: string | null) => (side ? side.toUpperCase() : null);
