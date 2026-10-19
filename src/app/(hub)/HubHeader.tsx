import Link from "next/link";
import ThemeToggle from "@/er/components/ThemeToggle";
import { MarkSvg } from "./Mark";

export default function HubHeader() {
  return (
    <header className="border-b border-line-soft">
      <div className="mx-auto flex min-h-14 max-w-[1280px] items-center gap-3.5 px-6 max-[760px]:px-4">
        <Link className="flex items-center gap-2 text-[15px] font-bold whitespace-nowrap no-underline" href="/">
          <MarkSvg className="size-6" />
          Labs
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
