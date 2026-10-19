export const ACCENT = "#c8d65a";

export function MarkSvg({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#000" />
      <rect x=".5" y=".5" width="63" height="63" rx="14.5" fill="none" stroke="#fff" strokeOpacity=".14" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21l11 11-11 11" stroke="#f5f5f7" strokeWidth="6" />
        <path d="M33 44h17" stroke={ACCENT} strokeWidth="7" />
      </g>
    </svg>
  );
}
