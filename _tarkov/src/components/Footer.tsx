import Link from "next/link";

export default function Footer({ wide }: { wide?: boolean }) {
  return (
    <footer className={wide ? "foot wide" : "foot"}>
      <span>tarkov.mongsil.dev</span>
      <Link href="/criteria">판정 기준</Link>
      <Link href="/privacy">개인정보 처리방침</Link>
      <a href="https://github.com/MongsilDev/tarkov-labs">GitHub</a>
    </footer>
  );
}
