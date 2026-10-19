import Link from "next/link";

export default function Footer({ wide }: { wide?: boolean }) {
  return (
    <footer className={wide ? "foot wide" : "foot"}>
      <span>er.mongsil.dev</span>
      <Link href="/privacy">개인정보 처리방침</Link>
      <a href="https://github.com/MongsilDev/er-labs">GitHub</a>
    </footer>
  );
}
