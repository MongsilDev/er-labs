import Link from "next/link";
import { Logo } from "@/er/components/kel/Team";
import { rampColor } from "@/er/lib/format";
import { EVENT_NAME, KEL_SCREENS, type KelEvent } from "@/er/lib/kel";
import type { RaceGroup } from "@/er/server/kel-race";

const CIRCUITS = 4;
const circuitName = (i: number) => EVENT_NAME[`c${i + 1}` as KelEvent];
const monthDay = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일`;
const int = (n: number) => n.toLocaleString("ko-KR");
// 진출 확률 화면과 같은 표기
const percent = (v: number) => (v >= 0.995 ? ">99" : v < 0.005 ? "<1" : Math.round(v * 100));

function Head({ group, dday, legend }: { group: RaceGroup; dday: string | null; legend?: boolean }) {
  const sure = group.rows.every((r) => r.sure);
  return (
    <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <Link className="text-[14px] font-extrabold no-underline hover:underline" href={KEL_SCREENS.rules.path}>
        {group.stage}
      </Link>
      {sure && <span className="text-[12px] font-bold text-accent-text">확정</span>}
      <span className="text-[13px] text-fg-3 tabular-nums">
        {monthDay(group.day)}
        {dday && <b className="ml-1.5 font-extrabold text-fg-2">{dday}</b>}
      </span>
      {legend && (
        <Link className="legend ml-auto no-underline hover:text-fg" href={KEL_SCREENS.circuits.path}>
          <span>
            {circuitName(0)}
            <i className="ramp" style={{ background: `linear-gradient(90deg, ${rampColor(0, CIRCUITS)}, ${rampColor(CIRCUITS - 1, CIRCUITS)})` }} />
            {circuitName(CIRCUITS - 1)}
          </span>
        </Link>
      )}
    </div>
  );
}

// 줄은 시즌 순위, 막대는 서킷 1~4에서 얻은 포인트를 이어 붙인 것
function Rows({ group, max, className }: { group: RaceGroup; max: number; className: string }) {
  return (
    <ul className={`grid grid-flow-col gap-x-6 ${className}`}>
      {group.rows.map((r) => (
        <li key={r.team.key} className="min-w-0 border-t border-line-soft">
          <Link className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 py-[7px] no-underline" href={KEL_SCREENS.odds.path}>
            <span className="text-[13px] font-bold text-fg-3 tabular-nums">{r.rank}</span>
            <span className="flex min-w-0 items-center gap-2">
              <Logo team={r.team} size={20} />
              <span className="min-w-0 truncate text-[14px] font-bold max-[760px]:sr-only">{r.team.name}</span>
              <span className="hidden text-[14px] font-bold max-[760px]:inline" aria-hidden="true">
                {r.team.short}
              </span>
              <span className="ml-auto flex-none text-[14px] font-extrabold tabular-nums">
                {!r.sure && r.p !== null && <span className="mr-2 text-[12px] font-bold text-fg-3">{percent(r.p)}%</span>}
                {int(r.total)}
              </span>
            </span>
            <span className="bar col-start-2" style={{ height: 8 }} aria-hidden="true">
              {r.points.map((v, i) =>
                v > 0 ? <s key={i} style={{ width: `${(v / max) * 100}%`, background: rampColor(i, CIRCUITS) }} title={`${circuitName(i)} ${r.team.circuits[i]}위 ${int(v)}포인트`} /> : null,
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function RaceBoard({ groups, days }: { groups: RaceGroup[]; days: (string | null)[] }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.rows.map((r) => r.total)));
  const [seeds, semi] = groups;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-8 gap-y-4 max-[760px]:grid-cols-[minmax(0,1fr)]">
      <div className="min-w-0">
        <Head group={seeds} dday={days[0]} />
        <Rows group={seeds} max={max} className="grid-rows-4 max-[760px]:grid-cols-2 max-[760px]:grid-rows-2" />
      </div>
      <div className="min-w-0">
        <Head group={semi} dday={days[1]} legend />
        <Rows group={semi} max={max} className="grid-cols-2 grid-rows-4" />
      </div>
    </div>
  );
}
