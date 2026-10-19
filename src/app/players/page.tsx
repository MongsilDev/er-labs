import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Recent from "@/components/players/Recent";
import SearchBox from "@/components/players/SearchBox";
import { date, int } from "@/lib/format";
import { getMeta } from "@/server/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "계정 조회",
  description: "Escape from Tarkov 닉네임으로 PvP, 시즌, PvE, 아레나 전적 조회",
};

export default function Players() {
  const indexed = Number(getMeta("indexed_at")) || null;
  const count = Number(getMeta("accounts")) || 0;
  return (
    <>
      <Header crumb={{ href: "/players", label: "계정 조회" }} />
      <main id="main" className="wrap slim">
        <h1 className="page-h1">계정 조회</h1>
        <SearchBox autoFocus />
        <p className="sub note">
          tarkov.dev에서 한 번 이상 조회된 계정만 찾을 수 있습니다.
          {indexed ? ` 이름 목록 ${int(count)}명, ${date(indexed)} 기준.` : " 이름 목록을 준비하고 있습니다."}
        </p>
        <Recent />
      </main>
      <Footer />
    </>
  );
}
