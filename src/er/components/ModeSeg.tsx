import { MODE_LABEL, type Mode } from "@/er/lib/rules";

const MODES: [Mode, string][] = [
  ["points", "라운드 수 고정"],
  ["checkpoint", "1위 확정 시 종료"],
  ["double", "2위 확정 시 종료"],
];

export default function ModeSeg({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <fieldset>
      <legend className="lbl">진행 방식</legend>
      <div className="seg">
        {MODES.map(([m, small]) => (
          <label key={m}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => onChange(m)} />
            {MODE_LABEL[m]}
            <small>{small}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
