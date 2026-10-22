import Lines from "@/components/Lines";
import Footer from "@/components/SiteFooter";
import Header from "@/er/components/Header";
import { KEL_SCREENS, type KelScreen } from "@/er/lib/kel";
import type { User } from "@/er/server/auth";

export default function KelPage({
  user,
  owner,
  screen,
  lead,
  notes = [],
  children,
}: {
  user: User | null;
  owner: boolean;
  screen: KelScreen;
  lead?: string;
  notes?: string[];
  children: React.ReactNode;
}) {
  const s = KEL_SCREENS[screen];
  return (
    <>
      <Header user={user} crumb="KEL 기록" crumbHref={KEL_SCREENS.home.path} next={s.path} />
      <main id="main" className="wrap grid grid-cols-1 content-start gap-5 pt-6">
        <div>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[28px] font-extrabold tracking-[-0.5px] max-[760px]:text-[24px]">
            {s.title}
            {owner && !s.public && <span className="chip">나만 보기</span>}
          </h1>
          {lead && (
            <p className="mt-2 max-w-[720px] text-fg-2">
              <Lines text={lead} />
            </p>
          )}
        </div>
        {children}
        <p className="text-[13px] leading-relaxed text-fg-3">
          <Lines text={[...notes, "팀 로고의 저작권은 각 구단에 있습니다."].join(" ")} />
        </p>
      </main>
      <Footer />
    </>
  );
}
