import { rampColor, rampTextClass } from "@/er/lib/format";

const STEPS = 10;

// 0~1 값을 단계 색으로 칠한 표 칸, 값이 없으면 -
export default function HeatCell({ v, className, children }: { v: number | null; className?: string; children?: React.ReactNode }) {
  if (v === null) return <td className={["h none text-fg-3", className].filter(Boolean).join(" ")}>-</td>;
  const step = Math.min(STEPS - 1, Math.floor(v * STEPS));
  return (
    <td className={["h", className, rampTextClass(step, STEPS)].filter(Boolean).join(" ")} style={{ background: rampColor(step, STEPS) }}>
      {children}
    </td>
  );
}
