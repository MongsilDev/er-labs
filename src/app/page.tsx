import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { currentUser } from "@/server/auth";

export default async function Home() {
  const user = await currentUser();
  return (
    <>
      <Header user={user} next="/score" />
      <main id="main" className="wrap slim">
        <h1 className="page-h1">이터널 리턴 도구</h1>
        <ul className="tools">
          <li>
            <Link className="panel tool" href="/score">
              <b>점수 계산</b>
              <span className="muted">커스텀 게임 결과 CSV로 대회 순위, 감점, 체크포인트, 밴 계산</span>
            </Link>
          </li>
        </ul>
      </main>
      <Footer />
    </>
  );
}
