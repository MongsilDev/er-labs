import { type CutData, DAY, dayStart, md, TIERS } from "@/er/lib/cut";

/** 첫 화면용 휴면 강등 일정. 날짜별로 두 티어를 쌓은 막대 */
export default function DecayMini({ data }: { data: CutData }) {
  const counts = new Map<string, Record<string, number>>();
  for (const { key } of TIERS) for (const [d, n] of data.tiers[key].decay) counts.set(d, { ...counts.get(d), [key]: n });
  const keys = [...counts.keys()].sort();
  if (!keys.length) return null;
  // 인원이 없는 날도 칸을 두어 날짜 간격을 그대로
  const dates: string[] = [];
  for (let t = dayStart(keys[0]); t <= dayStart(keys[keys.length - 1]); t += DAY) dates.push(new Date(t + 9 * 3_600_000).toISOString().slice(0, 10));
  const peak = Math.max(...keys.map((d) => Object.values(counts.get(d)!).reduce((a, b) => a + b, 0)));
  return (
    <figure className="mt-4">
      <figcaption className="mb-2 text-[13px] text-fg-3">휴면 강등으로 컷 아래로 내려가는 인원</figcaption>
      <div className="flex h-16 items-end gap-1" aria-hidden="true">
        {dates.map((d) => (
          <div key={d} className="flex flex-1 flex-col-reverse" title={`${md(dayStart(d))} ${TIERS.map(({ key, name }) => `${name} ${counts.get(d)?.[key] ?? 0}명`).join(", ")}`}>
            {TIERS.map(({ key, color }) => {
              const n = counts.get(d)?.[key] ?? 0;
              return n ? <span key={key} className="block" style={{ height: `${(n / peak) * 64}px`, background: color }} /> : null;
            })}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-fg-3 tabular-nums">
        <span>{md(dayStart(dates[0]))}</span>
        <span>{md(dayStart(dates[dates.length - 1]))}</span>
      </div>
    </figure>
  );
}
