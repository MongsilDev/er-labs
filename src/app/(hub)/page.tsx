import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ExampleBoard from "@/er/components/ExampleBoard";
import ThemeToggle from "@/er/components/ThemeToggle";
import { tournamentCount } from "@/er/server/tournament";
import { int as rp, TIERS, tens } from "@/er/lib/cut";
import { getCut } from "@/er/server/cut";
import DecayMini from "@/er/components/cut/DecayMini";
import { ACCENT as TARKOV_ACCENT } from "@/tarkov/components/Mark";
import { date, int } from "@/tarkov/lib/format";
import { COMMON, PERSONAL } from "@/tarkov/lib/kord";
import { baselineAccounts } from "@/tarkov/server/baseline";
import { getMeta } from "@/tarkov/server/db";

export const dynamic = "force-dynamic";

const ER_ACCENT = "#26f1f6";

function Title({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="group text-[22px] leading-snug font-extrabold tracking-[-0.3px] no-underline" href={href}>
      {children}
      <svg className="ml-1 inline-block size-5 align-[-3px] text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="mt-auto flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-4">
      {items.map((s) => (
        <div key={s.label} className="grid gap-0.5">
          <dt className="text-[12px] text-fg-3">{s.label}</dt>
          <dd className="text-[20px] leading-tight font-extrabold tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tool({ game, accent, href, name, desc, children, stats, className = "" }: {
  game: string;
  accent: string;
  href: string;
  name: string;
  desc: string;
  children?: React.ReactNode;
  stats: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <section className={`panel flex flex-col p-6 max-[760px]:p-5 ${className}`} aria-label={name}>
      <span className="mb-1.5 flex items-center gap-2 text-[13px] text-fg-3">
        <span className="size-2 rounded-full" style={{ background: accent }} aria-hidden="true" />
        {game}
      </span>
      <Title href={href}>{name}</Title>
      <p className="mt-1 text-[14px] text-fg-2">{desc}</p>
      {children && <div className="mt-5 mb-5">{children}</div>}
      <Stats items={stats} />
    </section>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export default async function Hub() {
  const cut = await getCut();
  const indexed = Number(getMeta("indexed_at")) || null;
  const plus = PERSONAL.filter((p) => (p.points ?? 0) < 0);
  const minus = PERSONAL.filter((p) => (p.points ?? 0) > 0);
  // 포인트를 가장 많이 쓰는 긍정 특성과 가장 많이 얻는 부정 특성 둘씩
  const picks = [...[...plus].sort((a, b) => a.points! - b.points!).slice(0, 2), ...[...minus].sort((a, b) => b.points! - a.points!).slice(0, 2)];
  return (
    <>
      <SiteHeader>
        <ThemeToggle />
      </SiteHeader>
      <main id="main" className="wrap">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4 pb-6 max-[760px]:pt-1 max-[760px]:pb-5">
          <h1 className="text-[30px] leading-none font-extrabold tracking-[-0.6px]">Labs</h1>
          <p className="text-[15px] text-fg-3">게임 도구 모음</p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <Tool
            game="이터널 리턴"
            accent={ER_ACCENT}
            href="/er/score"
            name="점수 계산"
            desc="결과 CSV로 대회 순위, 감점, 체크포인트, 밴 계산"
            stats={[{ label: "진행 중인 대회", value: `${int(tournamentCount())}개` }]}
          >
            <ExampleBoard rows={3} bare />
          </Tool>

          <Tool
            game="이터널 리턴"
            accent={ER_ACCENT}
            href="/er/cut"
            name="이터컷 예측"
            desc="휴면 강등을 반영한 아시아1 컷과 시즌 종료 예상"
            stats={
              cut
                ? [
                    { label: "이터니티 컷 위 휴면", value: `${rp(cut.tiers.eternity.decay.reduce((n, [, c]) => n + c, 0) + cut.tiers.eternity.decayStay)}명` },
                    { label: "데미갓 컷 위 휴면", value: `${rp(cut.tiers.demigod.decay.reduce((n, [, c]) => n + c, 0) + cut.tiers.demigod.decayStay)}명` },
                  ]
                : []
            }
          >
            {cut ? (
              <div className="cut">
                <ul className="grid">
                  {TIERS.map(({ key, name, color }) => {
                    const tier = cut.tiers[key];
                    const end = tier.forecast?.[tier.forecast.length - 1];
                    return (
                      <li key={key} className="flex items-baseline gap-3 border-t border-line-soft py-2 first:border-t-0 first:pt-0">
                        <span className="text-[14px] font-bold">{name}</span>
                        <span className="ml-auto text-[14px] font-extrabold tabular-nums">
                          {tier.estimated ? "약 " : ""}
                          {tier.cut != null ? rp(tier.cut) : "-"}
                        </span>
                        {end && (
                          <span className="w-[96px] text-right text-[13px] text-fg-3 tabular-nums">
                            종료 <b className="font-extrabold" style={{ color }}>{tens(end[1])}</b>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <DecayMini data={cut} />
              </div>
            ) : (
              <p className="text-[13px] text-fg-3">지금은 컷 정보를 가져올 수 없습니다.</p>
            )}
          </Tool>

          <Tool
            game="Escape from Tarkov"
            accent={TARKOV_ACCENT}
            href="/tarkov/players"
            name="계정 조회"
            desc="시즌, PvP, PvE, 아레나 전적과 판정 배지"
            stats={[
              { label: "색인 계정", value: int(Number(getMeta("accounts")) || 0) },
              { label: "판정 비교군", value: int(baselineAccounts()) },
            ]}
          >
            <form className="flex gap-2" action="/tarkov/players" method="get" role="search">
              <input
                className="field min-w-0 flex-1"
                type="search"
                name="q"
                placeholder="닉네임 또는 계정 번호"
                aria-label="닉네임 또는 계정 번호"
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                required
              />
              <button className="btn primary" type="submit">
                조회
              </button>
            </form>
            <p className="mt-3 text-[13px] text-fg-3">
              tarkov.dev에서 한 번 이상 조회된 계정만 찾을 수 있습니다.
              <br />
              {indexed && <>이름 목록 {date(indexed)} 기준, </>}
              <Link className="link" href="/tarkov/criteria">
                판정 기준
              </Link>
            </p>
          </Tool>

          <Tool
            game="Escape from Tarkov"
            accent={TARKOV_ACCENT}
            href="/tarkov/kord-breach"
            name="KORD BREACH 특성 시뮬레이터"
            desc="시즌 1 특성 포인트 계산"
            stats={[
              { label: "공통 특성", value: int(COMMON.length) },
              { label: "긍정 특성", value: int(plus.length) },
              { label: "부정 특성", value: int(minus.length) },
            ]}
          >
            <ul className="grid">
              {picks.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-t border-line-soft py-2 first:border-t-0 first:pt-0">
                  <span className="min-w-0 truncate text-[14px] font-bold">{p.name}</span>
                  <span className="ml-auto text-[14px] font-extrabold tabular-nums text-fg-2">{signed(p.points!)}</span>
                </li>
              ))}
            </ul>
          </Tool>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
