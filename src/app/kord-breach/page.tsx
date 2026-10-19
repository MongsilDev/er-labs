import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Simulator from "@/components/kord/Simulator";
import "./kord.css";

export const metadata: Metadata = {
  title: "KORD BREACH 특성 시뮬레이터",
  description: "Escape from Tarkov 시즌 1 KORD BREACH 특성 포인트 계산",
};

export default function KordBreachPage() {
  return (
    <>
      <Header crumb={{ href: "/kord-breach", label: "KORD BREACH" }} />
      <main id="main" className="wrap">
        <Simulator />
      </main>
      <Footer />
    </>
  );
}
