import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Simulator from "@/components/kord/Simulator";
import "./kord.css";

export const metadata: Metadata = {
  title: "KORD BREACH 특성 시뮬레이터",
  description: "Escape from Tarkov 시즌 1 Kord Breach 특성 포인트 계산",
};

export default function KordBreachPage() {
  return (
    <>
      <Header crumb={{ href: "/kord-breach", label: "KORD BREACH" }} />
      <main id="main" className="wrap">
        <h1 className="page-h1">KORD BREACH 특성 시뮬레이터</h1>
        <p className="sub kb-lead">긍정 특성은 포인트를 쓰고 부정 특성은 포인트를 얻습니다. 남은 포인트가 0 이상이어야 시즌을 시작할 수 있습니다.</p>
        <Simulator />
      </main>
      <Footer />
    </>
  );
}
