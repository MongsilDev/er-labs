import Link from "next/link";
import { avatarUrl, type User } from "@/er/server/auth";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export const Mark = () => (
  <Link className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap no-underline" href="/">
    <svg className="size-6" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#000" />
      <rect x=".5" y=".5" width="63" height="63" rx="14.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21l11 11-11 11" stroke="#f5f5f7" strokeWidth="6" />
        <path d="M33 44h17" stroke="#26f1f6" strokeWidth="7" />
      </g>
    </svg>
    Labs
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
    <header className="border-b border-line-soft">
      <a className="absolute -left-[9999px] focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2" href="#main">본문으로 건너뛰기</a>
      <div className={`mx-auto flex min-h-14 items-center gap-3.5 px-6 max-[760px]:flex-wrap max-[760px]:gap-y-2 max-[760px]:px-4 max-[760px]:py-2 ${wide ? "max-w-[1680px]" : "max-w-[1280px]"}`}>
        <Mark />
        <Link className="font-semibold whitespace-nowrap text-fg-2 no-underline before:mr-3.5 before:text-line before:content-['/']" href="/er">
          ER
        </Link>
        {crumb && (
          <Link className="font-semibold whitespace-nowrap text-fg-2 no-underline before:mr-3.5 before:text-line before:content-['/'] max-[480px]:hidden" href="/er/score">
            {crumb}
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          {right}
          {user ? (
            <UserMenu name={user.name} avatar={avatarUrl(user)} />
          ) : login ? (
            <a className="btn sm" href={`/auth/login?next=${encodeURIComponent(next ?? "/er/score")}`}>
              로그인
            </a>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
