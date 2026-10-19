import Script from "next/script";
import { ANALYTICS_TOKEN, GA_ID } from "@/site";

// 페이지만 열고 나가는 봇이 GA와 Web Analytics에 찍히지 않게, 입력이나 10초 체류 뒤에만 불러옴. mongsil.dev, bori.wiki와 같은 방식
const loader = `(function(){
if(navigator.webdriver)return;
var ev=['pointerdown','keydown','scroll','touchstart','mousemove'],timer,done=false;
function add(src,beacon){var s=document.createElement('script');s.async=true;s.src=src;if(beacon)s.setAttribute('data-cf-beacon',beacon);document.head.appendChild(s);}
function load(){
if(done)return;done=true;clearTimeout(timer);
ev.forEach(function(e){removeEventListener(e,load,true);});
document.removeEventListener('visibilitychange',arm);
window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};
gtag('js',new Date());gtag('config','${GA_ID}');
add('https://www.googletagmanager.com/gtag/js?id=${GA_ID}');
add('https://static.cloudflareinsights.com/beacon.min.js','{"token":"${ANALYTICS_TOKEN}"}');
}
function arm(){clearTimeout(timer);if(document.visibilityState==='visible')timer=setTimeout(load,10000);}
ev.forEach(function(e){addEventListener(e,load,{capture:true,passive:true});});
document.addEventListener('visibilitychange',arm);arm();
})();`;

export default function Analytics() {
  if (!process.env.BASE_URL?.startsWith("https://")) return null;
  return (
    <Script id="analytics" strategy="afterInteractive">
      {loader}
    </Script>
  );
}
