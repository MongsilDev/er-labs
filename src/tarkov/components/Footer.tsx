import Link from "next/link";

export default function Footer({ wide }: { wide?: boolean }) {
  return (
    <footer className={wide ? "foot wide" : "foot"}>
      <span>labs.mongsil.dev</span>
      <Link href="/tarkov/criteria">판정 기준</Link>
      <Link href="/tarkov/privacy">개인정보 처리방침</Link>
      <a href="https://github.com/MongsilDev/labs">GitHub</a>
    </footer>
  );
}
