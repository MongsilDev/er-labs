import { FLAGS } from "./summary";

const ARENA: Record<string, string> = {
  LastHero: "LastHero",
  CheckPoint: "CheckPoint",
  TeamFight: "TeamFight",
  ShootOutDuo: "ShootOut Duo",
  ShootOutSolo: "ShootOut Solo",
  ShootOutTrio: "ShootOut Trio",
  ShootOut: "ShootOut",
  BlastGang: "BlastGang",
};

export function arenaModeLabel(key: string): string {
  const ranked = key.startsWith("Ranked");
  const base = key.replace(/^(Unranked|Ranked)/, "");
  return `${ARENA[base] ?? base}${ranked ? " Ranked" : ""}`;
}

export function memberChips(member: number): { label: string; official: boolean }[] {
  const out: { label: string; official: boolean }[] = [];
  if (member & FLAGS.developer) out.push({ label: "Developer", official: true });
  if (member & FLAGS.sherpa) out.push({ label: "Sherpa", official: true });
  if (member & FLAGS.emissary) out.push({ label: "Emissary", official: true });
  if (member & FLAGS.moderator) out.push({ label: "채팅 관리자", official: true });
  if (member & FLAGS.unheard) out.push({ label: "Unheard", official: false });
  else if (member & FLAGS.eod) out.push({ label: "EOD", official: false });
  return out;
}

export const sideLabel = (side: string | null) => (side ? side.toUpperCase() : null);
