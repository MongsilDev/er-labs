import Link from "next/link";
import { MarkSvg } from "./SiteMark";
import "./site.css";

export default function SiteHeader({
  crumb,
  wide,
  children,
}: {
  crumb?: { href: string; label: string };
  wide?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="site-top">
      <a className="site-skip" href="#main">
        본문으로 건너뛰기
      </a>
      <div className={wide ? "site-top-in wide" : "site-top-in"}>
        <Link className="site-mark" href="/">
          <MarkSvg />
          Labs
        </Link>
        {crumb && (
          <Link className="site-crumb" href={crumb.href}>
            {crumb.label}
          </Link>
        )}
        <div className="site-right">{children}</div>
      </div>
    </header>
  );
}
