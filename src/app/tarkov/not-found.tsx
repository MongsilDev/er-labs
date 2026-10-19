import Link from "next/link";
import Footer from "@/tarkov/components/Footer";
import Header from "@/tarkov/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="wrap slim">
        <section className="panel nf">
          <h1>없는 페이지입니다</h1>
          <Link className="btn primary" href="/tarkov/players">
            계정 조회로 이동
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
