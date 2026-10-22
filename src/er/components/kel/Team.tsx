import { LOGO_CDN, wikiUrl, type KelTeam } from "@/er/lib/kel";

export function Logo({ team, size = 24 }: { team: KelTeam; size?: number }) {
  return (
    <span
      className={`inline-grid flex-none place-items-center rounded-[5px] p-[2px] ${team.dark ? "bg-[#1d2431]" : "bg-[#e9edf3]"}`}
      style={{ width: size, height: size }}
      title={team.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="size-full object-contain" src={`${LOGO_CDN}/${team.key}.png`} alt="" width={size} height={size} loading="lazy" />
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
