import Link from "next/link";
import Lines from "@/components/Lines";
import KelPage from "@/er/components/kel/KelPage";
import { Logo, TeamName } from "@/er/components/kel/Team";
import Char from "@/er/components/t/Char";
import { int } from "@/er/lib/cut";
import { championshipTeams, KEL_SCREENS, KEL_SECTIONS, kelVisible, TEAM, type KelTeam } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata, kelSummary, type KelRow } from "@/er/server/kel";
import { gameLabel, records, wicklines } from "@/er/server/kel-stats";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("home");

const day = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일`;
};

function Event({ date, name, teams, slot, text }: { date: string; name: string; teams: KelTeam[]; slot?: string; text: string }) {
  return (
    <section className="panel grid content-start gap-3 p-5 max-[760px]:p-4" aria-label={name}>
      <div>
        <p className="text-[13px] text-fg-3">{date}</p>
        <h2 className="text-[22px] font-extrabold tracking-[-0.3px]">{name}</h2>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        {teams.map((t) => (
          <li key={t.key} className="min-w-0">
            <TeamName team={t} size={28} />
          </li>
        ))}
        {slot && <li className="col-span-2 rounded-md border border-dashed border-line-strong px-3 py-1.5 text-fg-3">{slot}</li>}
      </ul>
      <p className="text-[14px] text-fg-2">
        <Lines text={text} />
      </p>
    </section>
  );
}

function Best({ label, value, unit, href, children }: { label: string; value: React.ReactNode; unit?: string; href?: string; children: React.ReactNode }) {
  const body = (
    <>
      <p className="text-[13px] text-fg-3">{label}</p>
      <p className="text-[28px] leading-none font-extrabold tabular-nums max-[760px]:text-[24px]">
        {value}
        {unit && <span className="ml-0.5 text-[16px]">{unit}</span>}
      </p>
      {children}
    </>
  );
  const box = "panel grid content-start gap-2 p-5 max-[760px]:p-4";
  return href ? (
    <Link className={`${box} no-underline hover:border-line-strong`} href={href}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

function Who({ r }: { r: KelRow }) {
  return (
    <div className="mt-1 grid gap-1">
      <p className="text-[15px] font-bold">
        <Char name={r.character} label={r.player} />
      </p>
      <p className="text-[13px] leading-relaxed text-fg-3">
        {TEAM.get(r.team)!.name}
        <br />
        {gameLabel(r)}
      </p>
    </div>
  );
}

export default async function Page() {
  const { user, owner } = await kelGate("home");
  const data = kelData();
  const summary = data ? kelSummary(data) : null;
  const rec = data && records(data);
  const wick = data ? wicklines(data)[0] : undefined;
  const wickTeam = wick && TEAM.get(wick.team)!;
  const { seeds, semi } = championshipTeams();
  const lead = summary?.first && summary.last ? `${day(summary.first)} 오프닝 위크부터 ${day(summary.last)} 서킷 4 결승까지 ${summary.games}게임의 기록입니다.` : undefined;

  return (
    <KelPage user={user} owner={owner} screen="home" lead={lead}>
      <div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
        <Event date="11월 7일 토요일, 대전이스포츠경기장" name="준결승" teams={semi} text="정규 시즌 5~12위 8팀이 6라운드를 치릅니다. 상위 4팀이 결승에 올라갑니다." />
        <Event
          date="11월 8일 일요일, 대전이스포츠경기장"
          name="결승"
          teams={seeds}
          slot="준결승 상위 4팀"
          text="정규 시즌 1~4위는 결승에 바로 올라갔습니다. 순차 체크포인트 방식으로 최대 9라운드를 치릅니다."
        />
      </div>
      {rec && (
        <section aria-labelledby="best">
          <h2 id="best" className="text-[17px] font-extrabold">
            시즌 최고 기록
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 max-[760px]:grid-cols-2">
            <Best label="한 게임 최다 킬" value={rec.kills.kills} unit="킬" href={KEL_SCREENS.records.path}>
              <Who r={rec.kills} />
            </Best>
            <Best label="한 게임 최다 가한 피해" value={int(rec.damage[0].damage)} href={KEL_SCREENS.records.path}>
              <Who r={rec.damage[0]} />
            </Best>
            {rec.cc && (
              <Best label="한 게임 최다 군중제어 시간" value={rec.cc.dak.cc.toFixed(1)} unit="초">
                <Who r={rec.cc} />
              </Best>
            )}
            {rec.heal && (
              <Best label="한 게임 최다 팀원 회복" value={int(rec.heal.dak.heal)}>
                <Who r={rec.heal} />
              </Best>
            )}
            {rec.camera && (
              <Best label="한 게임 최다 카메라 설치" value={rec.camera.dak.camera} unit="개">
                <Who r={rec.camera} />
              </Best>
            )}
            {wick && wickTeam && (
              <Best label="위클라인 최다 처치" value={wick.count} unit="번">
                <div className="mt-1 grid gap-1">
                  <p className="flex items-center gap-1.5 text-[15px] font-bold">
                    <Logo team={wickTeam} size={22} />
                    {wickTeam.name}
                  </p>
                  <p className="text-[13px] text-fg-3">{wick.games}게임에서</p>
                </div>
              </Best>
            )}
          </div>
        </section>
      )}
      {KEL_SECTIONS.map((s) => {
        const items = s.items.filter(([key]) => kelVisible(key, owner));
        if (!items.length) return null;
        return (
          <section key={s.title} className="panel grid grid-cols-[160px_1fr] gap-5 p-5 max-[760px]:grid-cols-1 max-[760px]:gap-2 max-[760px]:p-4" aria-label={s.title}>
            <h2 className="text-[17px] font-extrabold">{s.title}</h2>
            <ul className="grid">
              {items.map(([key, desc]) => (
                <li key={key} className="border-b border-line-soft py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                  <Link className="font-bold decoration-line-strong underline-offset-[3px] hover:decoration-fg-3" href={KEL_SCREENS[key].path}>
                    {KEL_SCREENS[key].title}
                  </Link>
                  <p className="mt-0.5 text-[14px] text-fg-3">{desc}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </KelPage>
  );
}
