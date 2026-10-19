"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="wrap slim">
      <section className="panel nf">
        <h1>화면을 표시하지 못했습니다</h1>
        <p className="muted">잠시 뒤 다시 시도해주세요. 같은 문제가 계속되면 GitHub 이슈로 알려주세요.</p>
        <div className="acts">
          <button className="btn primary" type="button" onClick={reset}>
            다시 시도
          </button>
          <Link className="btn" href="/">
            처음으로
          </Link>
        </div>
      </section>
    </main>
  );
}
