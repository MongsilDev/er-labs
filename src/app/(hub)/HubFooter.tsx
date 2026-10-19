import Link from "next/link";

export default function HubFooter() {
  return (
    <footer className="mx-auto mt-8 mb-6 flex w-full max-w-[1280px] gap-4 px-6 text-[13px] text-fg-3 max-[760px]:px-4">
      <span>labs.mongsil.dev</span>
      <Link href="/privacy">개인정보 처리방침</Link>
      <a href="https://github.com/MongsilDev/labs">GitHub</a>
    </footer>
  );
}
