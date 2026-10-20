import Link from "next/link";
import "./site.css";

export default function SiteFooter({ wide }: { wide?: boolean }) {
  return (
    <footer className="site-foot">
      <div className={wide ? "site-foot-in wide" : "site-foot-in"}>
        <b>Labs</b>
        <nav aria-label="사이트 정보">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy">개인정보 처리방침</Link>
          <a href="https://github.com/MongsilDev/labs">GitHub</a>
          <a href="https://mongsil.dev">mongsil.dev</a>
        </nav>
      </div>
    </footer>
  );
}
