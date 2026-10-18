import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { currentUser } from "@/server/auth";

export default async function NotFound() {
  const user = await currentUser();
  return (
    <>
      <Header user={user} />
      <main id="main" className="wrap slim">
      <section className="panel nf">
        <h1>없는 페이지이거나 지워진 대회입니다</h1>
        <p className="muted">대회는 마지막 수정 24시간 뒤 자동으로 지워집니다.</p>
        <Link className="btn primary" href="/score">
          점수 계산으로 이동
        </Link>
      </section>
    </main>
      <Footer />
    </>
  );
}
