import Link from "next/link";
import HubFooter from "./HubFooter";
import HubHeader from "./HubHeader";
import { MarkSvg } from "./Mark";

const TOOLS = [
  { href: "/er", name: "이터널 리턴", accent: "#26f1f6", items: "커뮤니티 대회 점수 계산" },
  { href: "/tarkov", name: "Escape from Tarkov", accent: "#c8d65a", items: "계정 전적 조회, KORD BREACH 특성 시뮬레이터" },
];

export default function Hub() {
  return (
    <>
      <HubHeader />
      <main id="main" className="wrap slim">
        <h1 className="mt-3 mb-[18px] text-[28px] font-extrabold tracking-[-0.5px]">Labs</h1>
        <ul className="grid gap-2.5">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link className="panel flex items-center gap-4 px-5 py-[18px] no-underline hover:border-line-strong" href={t.href}>
                <MarkSvg className="size-9 shrink-0" accent={t.accent} />
                <span className="grid gap-1">
                  <b className="text-[17px]">{t.name}</b>
                  <span className="text-fg-3">{t.items}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <HubFooter />
    </>
  );
}
