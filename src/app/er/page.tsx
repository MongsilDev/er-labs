import Link from "next/link";
import Footer from "@/er/components/Footer";
import Header from "@/er/components/Header";
import { currentUser } from "@/er/server/auth";

export default async function Home() {
  const user = await currentUser();
  return (
    <>
      <Header user={user} next="/er/score" />
      <main id="main" className="wrap slim">
        <h1 className="mt-3 mb-[18px] text-[28px] font-extrabold tracking-[-0.5px]">이터널 리턴</h1>
        <ul className="grid gap-2.5">
          <li>
            <Link className="panel grid gap-1 px-5 py-[18px] no-underline hover:border-line-strong" href="/er/score">
              <b className="text-[17px]">점수 계산</b>
              <span className="text-fg-3">커스텀 게임 결과 CSV로 대회 순위, 감점, 체크포인트, 밴 계산</span>
            </Link>
          </li>
        </ul>
      </main>
      <Footer />
    </>
  );
}
