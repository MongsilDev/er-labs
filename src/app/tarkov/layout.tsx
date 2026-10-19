import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ANALYTICS_TOKEN } from "@/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://labs.mongsil.dev"),
  title: { default: "Escape from Tarkov - Labs", template: "%s - Labs" },
  description: "Escape from Tarkov 도구 모음. 계정 전적 조회, KORD BREACH 특성 시뮬레이터.",
  openGraph: { siteName: "Labs", type: "website", locale: "ko_KR" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
};

const themeScript = `(function(){try{var t=localStorage.getItem('labs-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#f1f2ee':'#0b0d0c'}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
