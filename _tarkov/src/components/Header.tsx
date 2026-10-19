import Link from "next/link";
import { MarkSvg } from "./Mark";
import ThemeToggle from "./ThemeToggle";

export default function Header({ crumb, wide }: { crumb?: { href: string; label: string }; wide?: boolean }) {
  return (
    <header className="top">
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <div className={`top-in ${wide ? "wide" : "narrow"}`}>
        <Link className="mark" href="/">
          <MarkSvg />
          Tarkov Labs
        </Link>
        {crumb && (
          <Link className="crumb" href={crumb.href}>
            {crumb.label}
          </Link>
        )}
        <div className="top-right">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
