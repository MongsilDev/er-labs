import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://er.mongsil.dev"),
  title: { default: "이터널 리턴 도구", template: "%s - 이터널 리턴 도구" },
  description: "이터널 리턴 커스텀 게임 결과 CSV로 대회 순위를 계산합니다.",
  openGraph: { siteName: "이터널 리턴 도구", type: "website", locale: "ko_KR" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
};

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
      </body>
    </html>
  );
}
