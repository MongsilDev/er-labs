import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ExampleBoard from "@/er/components/ExampleBoard";
import ThemeToggle from "@/er/components/ThemeToggle";
import { tournamentCount } from "@/er/server/tournament";
import { ACCENT as TARKOV_ACCENT } from "@/tarkov/components/Mark";
import { date, int } from "@/tarkov/lib/format";
import { baselineCounts } from "@/tarkov/server/baseline";
import { getMeta } from "@/tarkov/server/db";
import { nameChangeCount } from "@/tarkov/server/profiles";

export const dynamic = "force-dynamic";

const ER_ACCENT = "#26f1f6";

const TOOLS = [
  { href: "/er/score", game: "이터널 리턴", name: "점수 계산", desc: "결과 CSV로 대회 순위, 감점, 체크포인트, 밴 계산", accent: ER_ACCENT },
  { href: "/tarkov/players", game: "Escape from Tarkov", name: "계정 조회", desc: "시즌, PvP, PvE, 아레나 전적과 판정 배지", accent: TARKOV_ACCENT },
  { href: "/tarkov/kord-breach", game: "Escape from Tarkov", name: "KORD BREACH 특성 시뮬레이터", desc: "시즌 1 특성 포인트 계산", accent: TARKOV_ACCENT },
];

export default function Hub() {
  const indexed = Number(getMeta("indexed_at")) || null;
  const peers = Object.values(baselineCounts()).reduce((a, b) => a + b, 0);
  const stats = [
    { label: "진행 중인 대회", value: int(tournamentCount()), unit: "개" },
    { label: "Tarkov 색인 계정", value: int(Number(getMeta("accounts")) || 0), unit: "개" },
    { label: "판정 비교군", value: int(peers), unit: "명" },
    { label: "닉네임 변경 기록", value: int(nameChangeCount()), unit: "건" },
  ];
  return (
    <>
      <SiteHeader>
        <ThemeToggle />
      </SiteHeader>
      <main id="main" className="wrap">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,560px)] items-start gap-12 pt-8 max-[960px]:grid-cols-[minmax(0,1fr)] max-[960px]:gap-8 max-[960px]:pt-2">
          <section aria-labelledby="hub-h">
            <h1 id="hub-h" className="text-[56px] leading-none font-extrabold tracking-[-1.5px] max-[760px]:text-[44px]">
              Labs
            </h1>
            <p className="mt-3 text-[18px] text-fg-2">게임 도구 모음</p>
            <ul className="mt-8 grid gap-2.5">
              {TOOLS.map((t) => (
                <li key={t.href}>
                  <Link className="panel group flex items-center gap-4 px-5 py-4 no-underline hover:border-line-strong" href={t.href}>
                    <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: t.accent }} aria-hidden="true" />
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-[12px] text-fg-3">{t.game}</span>
                      <b className="text-[17px]">{t.name}</b>
                      <span className="text-[14px] text-fg-3">{t.desc}</span>
                    </span>
                    <svg className="ml-auto size-5 shrink-0 text-fg-3 group-hover:text-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-3" aria-label="점수 계산 예시">
            <span className="text-[13px] text-fg-3">점수 계산 예시</span>
            <ExampleBoard rows={5} />
          </section>
        </div>

        <section className="mt-16 max-[760px]:mt-12" aria-labelledby="stat-h">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
            <h2 id="stat-h" className="text-[18px] font-bold">
              현황
            </h2>
            {indexed && <span className="text-[13px] text-fg-3">Tarkov 이름 목록 {date(indexed)} 기준</span>}
          </div>
          <dl className="grid grid-cols-4 max-[760px]:grid-cols-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={[
                  "grid gap-2 border-line py-6 pr-6 max-[760px]:py-5 max-[760px]:pr-4",
                  i === 0 ? "pl-0" : "border-l pl-6",
                  i % 2 ? "max-[760px]:border-l max-[760px]:pl-4" : "max-[760px]:border-l-0 max-[760px]:pl-0",
                  i >= 2 ? "max-[760px]:border-t" : "",
                ].join(" ")}
              >
                <dt className="text-[13px] text-fg-3">{s.label}</dt>
                <dd className="text-[32px] leading-none font-extrabold tabular-nums max-[760px]:text-[26px]">
                  {s.value}
                  <span className="ml-1 text-[14px] font-medium text-fg-3">{s.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
