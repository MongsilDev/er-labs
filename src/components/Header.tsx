import Link from "next/link";
import { avatarUrl, type User } from "@/server/auth";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export const Mark = () => (
  <Link className="mark" href="/">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#000" />
      <rect x=".5" y=".5" width="63" height="63" rx="14.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21l11 11-11 11" stroke="#f5f5f7" strokeWidth="6" />
        <path d="M33 44h17" stroke="#26f1f6" strokeWidth="7" />
      </g>
    </svg>
    이터널 리턴 도구
  </Link>
);

export default function Header({
  user,
  crumb,
  wide,
  right,
  login = true,
  next,
}: {
  user: User | null;
  crumb?: string;
  wide?: boolean;
  right?: React.ReactNode;
  login?: boolean;
  next?: string;
}) {
  return (
    <header className="top">
      <a className="skip" href="#main">본문으로 건너뛰기</a>
      <div className={`top-in ${wide ? "wide" : "narrow"}`}>
        <Mark />
        {crumb && (
          <Link className="crumb" href="/score">
            {crumb}
          </Link>
        )}
        <div className="top-right">
          {right}
          {user ? (
            <UserMenu name={user.name} avatar={avatarUrl(user)} />
          ) : login ? (
            <a className="btn sm" href={`/auth/login?next=${encodeURIComponent(next ?? "/score")}`}>
              로그인
            </a>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
