import Link from "next/link";
import Footer from "@/tarkov/components/Footer";
import Header from "@/tarkov/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main" className="wrap slim">
        <h1 className="page-h1">Escape from Tarkov</h1>
        <ul className="tools">
          <li>
            <Link className="panel tool" href="/tarkov/players">
              <b>계정 조회</b>
              <span className="muted">닉네임으로 시즌, PvP, PvE, 아레나 전적과 판정 배지 확인</span>
            </Link>
          </li>
          <li>
            <Link className="panel tool" href="/tarkov/kord-breach">
              <b>KORD BREACH 특성 시뮬레이터</b>
              <span className="muted">시즌 1 특성 포인트 계산</span>
            </Link>
          </li>
        </ul>
      </main>
      <Footer />
    </>
  );
}
