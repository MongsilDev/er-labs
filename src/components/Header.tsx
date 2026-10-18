import Link from "next/link";
import { avatarUrl, type User } from "@/server/auth";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export const Mark = () => (
  <Link className="mark" href="/">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="36" width="11" height="18" fill="#1cc0c8" />
      <rect x="26.5" y="22" width="11" height="32" fill="#26F1F6" />
      <rect x="43" y="10" width="11" height="44" fill="#FFD621" />
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
