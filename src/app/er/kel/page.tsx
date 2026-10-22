import Link from "next/link";
import Lines from "@/components/Lines";
import KelPage from "@/er/components/kel/KelPage";
import { TeamName } from "@/er/components/kel/Team";
import { championshipTeams, KEL_SCREENS, type KelScreen, type KelTeam } from "@/er/lib/kel";
import { kelData, kelGate, kelMetadata, kelSummary } from "@/er/server/kel";

export const dynamic = "force-dynamic";
export const generateMetadata = () => kelMetadata("home");

const SECTIONS: { title: string; items: [KelScreen, string][] }[] = [
  {
    title: "챔피언십",
    items: [
      ["calc", "준결승 결승 진출 확률과 확정 여부, 결승 체크포인트"],
      ["rules", "결승 직행 조건, 순차 체크포인트, 감점, 동점 처리"],
    ],
  },
];

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

export default async function Page() {
  const { user, owner } = await kelGate("home");
  const data = kelData();
  const summary = data ? kelSummary(data) : null;
  const { seeds, semi } = championshipTeams();
  const lead = summary?.first && summary.last ? `${day(summary.first)} 오프닝 위크부터 ${day(summary.last)} 서킷 4 결승까지 ${summary.games}게임의 기록입니다.` : undefined;

  return (
    <KelPage user={user} owner={owner} screen="home" lead={lead} notes={["경기 기록은 님블뉴런 이스포츠 팀에게 받은 자료로 계산했습니다."]}>
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
      {SECTIONS.map((s) => {
        const items = s.items.filter(([key]) => owner || KEL_SCREENS[key].public);
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
