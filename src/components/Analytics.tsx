import Script from "next/script";
import { ANALYTICS_TOKEN } from "@/site";

// 페이지만 열고 나가는 봇이 Web Analytics에 찍히지 않게, 입력이나 10초 체류 뒤에만 불러옴. mongsil.dev, bori.wiki와 같은 방식
const loader = `(function(){
if(navigator.webdriver)return;
var ev=['pointerdown','keydown','scroll','touchstart','mousemove'],timer,done=false;
function load(){
if(done)return;done=true;clearTimeout(timer);
ev.forEach(function(e){removeEventListener(e,load,true);});
document.removeEventListener('visibilitychange',arm);
var s=document.createElement('script');s.async=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';
s.setAttribute('data-cf-beacon','{"token":"${ANALYTICS_TOKEN}"}');document.head.appendChild(s);
}
function arm(){clearTimeout(timer);if(document.visibilityState==='visible')timer=setTimeout(load,10000);}
ev.forEach(function(e){addEventListener(e,load,{capture:true,passive:true});});
document.addEventListener('visibilitychange',arm);arm();
})();`;

export default function Analytics() {
  if (!process.env.BASE_URL?.startsWith("https://")) return null;
  return (
    <Script id="cf-analytics" strategy="afterInteractive">
      {loader}
    </Script>
  );
}
