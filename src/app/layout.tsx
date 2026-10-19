import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://er.mongsil.dev"),
  title: { default: "ER Labs", template: "%s - ER Labs" },
  description: "이터널 리턴 도구 모음. 커뮤니티 대회 점수 계산.",
  openGraph: { siteName: "ER Labs", type: "website", locale: "ko_KR" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
};

// Cloudflare Web Analytics 비콘 토큰. 공개값이라 코드에 둠
const ANALYTICS_TOKEN = "bcb82a8155fd406aba6ddc424ff1b0be";

const themeScript = `(function(){try{var t=localStorage.getItem('er-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#eef1f5':'#0a0d14'}catch(e){}})()`;

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
