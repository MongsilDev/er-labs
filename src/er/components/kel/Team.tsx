import { LOGO_CDN, wikiUrl, type KelTeam } from "@/er/lib/kel";

export const plate = (team: KelTeam) => (team.dark ? "#1d2431" : "#e9edf3");
export const logoUrl = (team: KelTeam) => `${LOGO_CDN}/${team.key}.png`;

export function Logo({ team, size = 24, label = false }: { team: KelTeam; size?: number; label?: boolean }) {
  return (
    <span className="inline-grid flex-none place-items-center rounded-[5px] p-[2px]" style={{ width: size, height: size, background: plate(team) }} title={team.name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="size-full object-contain" src={logoUrl(team)} alt={label ? team.name : ""} width={size} height={size} loading="lazy" />
    </span>
  );
}

export function TeamName({ team, size = 24, link = true }: { team: KelTeam; size?: number; link?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Logo team={team} size={size} />
      {link ? (
        <a className="truncate decoration-line-strong underline-offset-[3px] hover:decoration-fg-3" href={wikiUrl(team.wiki)}>
          {team.name}
        </a>
      ) : (
        <span className="truncate">{team.name}</span>
      )}
    </span>
  );
}

export function PlayerName({ name, team }: { name: string; team?: KelTeam }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {team && <Logo team={team} size={22} label />}
      <a className="truncate font-semibold decoration-line-strong underline-offset-[3px] hover:decoration-fg-3" href={wikiUrl(name)}>
        {name}
      </a>
    </span>
  );
}
