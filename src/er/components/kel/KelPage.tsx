import Link from "next/link";
import Lines from "@/components/Lines";
import Footer from "@/components/SiteFooter";
import Header from "@/er/components/Header";
import { KEL_SCREENS, type KelScreen } from "@/er/lib/kel";
import type { User } from "@/er/server/auth";

type Text = string | (string | false | null | undefined)[];
type Tab<K extends string> = readonly [K, string];

const join = (t?: Text) => (Array.isArray(t) ? t.filter(Boolean).join(" ") : (t ?? ""));

export const NO_DATA = "경기 기록 CSV를 찾지 못했습니다. 서버 데이터 폴더의 kel 폴더에 넣어주세요.";

export const pickTab = <K extends string>(items: readonly Tab<K>[], value?: string): K => (items.find(([k]) => k === value) ?? items[0])[0];

export function KelTabs<K extends string>({ screen, param, label, items, current }: { screen: KelScreen; param: string; label: string; items: readonly Tab<K>[]; current: K }) {
  const path = KEL_SCREENS[screen].path;
  return (
    <nav className="tabs" aria-label={label}>
      {items.map(([k, name], i) => (
        <Link key={k} href={i === 0 ? path : `${path}?${param}=${k}`} aria-current={k === current ? "page" : undefined}>
          {name}
        </Link>
      ))}
    </nav>
  );
}

export default function KelPage({
  user,
  owner,
  screen,
  lead,
  notes = [],
  source = false,
  children,
}: {
  user: User | null;
  owner: boolean;
  screen: KelScreen;
  lead?: Text;
  notes?: Text;
  source?: boolean;
  children?: React.ReactNode;
}) {
  const s = KEL_SCREENS[screen];
  const intro = join(lead);
  const foot = [join(notes), source && "경기 기록은 님블뉴런 이스포츠 팀에게 받은 자료로 계산했습니다.", "팀 로고의 저작권은 각 구단에 있습니다."];
  return (
    <>
      <Header user={user} crumb="KEL 기록" crumbHref={KEL_SCREENS.home.path} next={s.path} />
      <main id="main" className="wrap grid grid-cols-1 content-start gap-5 pt-6">
        <div>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[28px] font-extrabold tracking-[-0.5px] max-[760px]:text-[24px]">
            {s.title}
            {owner && !s.public && <span className="chip">나만 보기</span>}
          </h1>
          {intro && (
            <p className="mt-2 max-w-[720px] text-fg-2">
              <Lines text={intro} />
            </p>
          )}
        </div>
        {children}
        <p className="text-[13px] leading-relaxed text-fg-3">
          <Lines text={join(foot)} />
        </p>
      </main>
      <Footer />
    </>
  );
}
