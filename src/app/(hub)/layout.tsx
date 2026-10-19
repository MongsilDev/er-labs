import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ANALYTICS_TOKEN } from "@/site";
import "../er/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://labs.mongsil.dev"),
  title: { default: "Labs", template: "%s - Labs" },
  description: "게임 도구 모음. 이터널 리턴 대회 점수 계산, Escape from Tarkov 계정 전적 조회와 특성 시뮬레이터.",
  openGraph: { siteName: "Labs", type: "website", locale: "ko_KR" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
};

const themeScript = `(function(){try{var t=localStorage.getItem('labs-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#eef1f5':'#0a0d14'}catch(e){}})()`;

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/fonts/pretendard/pretendardvariable-dynamic-subset.css" />
      </head>
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
        {process.env.BASE_URL?.startsWith("https://") && (
          <Script
            id="cf-analytics"
            strategy="afterInteractive"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: ANALYTICS_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
