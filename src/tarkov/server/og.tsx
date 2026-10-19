import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ACCENT } from "@/tarkov/components/Mark";
import { VERDICT_LABEL, type Verdict } from "@/tarkov/lib/criteria";
import { dateTime, dec, div, hours, int, pct } from "@/tarkov/lib/format";
import type { Mode } from "@/tarkov/lib/modes";
import type { Summary } from "@/tarkov/lib/summary";

export const OG_SIZE = { width: 1200, height: 630 };

const font = (w: string) => readFile(join(process.cwd(), `assets/fonts/Pretendard-${w}.otf`));
const fonts = Promise.all([font("Medium"), font("Bold"), font("ExtraBold")]);

const C = { bg: "#0a0d14", panel: "#121722", line: "#232a38", text: "#e8edf5", text2: "#aab3c5", text3: "#7c879c", warn: "#f0b429", alert: "#ff6b6b" };

const Mark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="15" fill="#000" />
    <rect x=".5" y=".5" width="63" height="63" rx="14.5" fill="none" stroke="#fff" strokeOpacity=".14" />
    <path d="M15 21l11 11-11 11" fill="none" stroke="#f5f5f7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M33 44h17" stroke={ACCENT} strokeWidth="7" strokeLinecap="round" />
  </svg>
);

async function options() {
  const [medium, bold, extra] = await fonts;
  return {
    ...OG_SIZE,
    fonts: [
      { name: "Pretendard", data: medium, weight: 500 as const },
      { name: "Pretendard", data: bold, weight: 700 as const },
      { name: "Pretendard", data: extra, weight: 800 as const },
    ],
  };
}

export async function siteImage(title = "Labs", sub = "Escape from Tarkov 도구 모음") {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: C.bg, color: C.text, fontFamily: "Pretendard", padding: "0 96px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Mark size={120} />
          <span style={{ fontSize: 88, fontWeight: 800 }}>{title}</span>
        </div>
        <span style={{ fontSize: 36, fontWeight: 500, color: C.text2, marginTop: 36 }}>{sub}</span>
        <span style={{ fontSize: 28, fontWeight: 500, color: C.text3, marginTop: 14 }}>labs.mongsil.dev/tarkov</span>
      </div>
    ),
    await options(),
  );
}

function stats(s: Summary): [string, string][] {
  if (s.kind === "arena") {
    const t = s.total;
    return [
      ["K/D", dec(div(t?.kills, t?.deaths))],
      ["헤드샷 비율", pct(div(t?.headshots, t?.kills))],
      ["한 경기 최다 킬", int(t?.maxGameKills)],
      ["경기", int(t?.games)],
    ];
  }
  return [
    ["PMC K/D", dec(div(s.pmcKills, s.kia))],
    ["생존율", pct(div(s.survived, s.raids))],
    ["레이드", int(s.raids)],
    ["플레이 시간", hours(s.seconds)],
  ];
}

export async function profileImage(name: string, mode: Mode, s: Summary | null, v: Verdict | null) {
  const badge = v ? VERDICT_LABEL[v.state] : null;
  const badgeBg = v?.state === "alert" ? C.alert : v?.state === "warn" ? C.warn : C.panel;
  const badgeFg = v?.state === "alert" ? "#fff" : v?.state === "warn" ? "#111" : C.text2;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: C.bg, color: C.text, fontFamily: "Pretendard", padding: "52px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Mark size={44} />
          <span style={{ fontSize: 26, fontWeight: 700, color: C.text2 }}>Labs</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 34 }}>
          <span style={{ fontSize: 64, fontWeight: 800, maxWidth: 760, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{name}</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: C.text2, border: `2px solid ${C.line}`, borderRadius: 8, padding: "4px 14px" }}>{mode.label}</span>
          {badge && (
            <span style={{ fontSize: 28, fontWeight: 800, color: badgeFg, background: badgeBg, borderRadius: 8, padding: "6px 16px" }}>{badge}</span>
          )}
        </div>
        {s ? (
          <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
            {stats(s).map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "26px 0" }}>
                <span style={{ fontSize: 50, fontWeight: 800 }}>{value}</span>
                <span style={{ fontSize: 24, fontWeight: 500, color: C.text3, marginTop: 6 }}>{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 30, color: C.text3, marginTop: 44 }}>tarkov.dev에서 조회된 기록이 없습니다.</span>
        )}
        <span style={{ fontSize: 24, color: C.text3, marginTop: "auto" }}>{s ? `${dateTime(s.updated)} 기준, 통계 기준이며 증거가 아닙니다.` : ""}</span>
      </div>
    ),
    await options(),
  );
}
