import Header from "@/tarkov/components/Header";
import "./profile.css";

export default function Loading() {
  return (
    <>
      <Header crumb={{ href: "/tarkov/players", label: "계정 조회" }} />
      <main id="main" className="wrap profile" aria-busy="true">
        <p className="sub" role="status">
          tarkov.dev에서 전적을 불러오는 중입니다
        </p>
        <div className="panel skel" style={{ height: 150 }} />
        <div className="skel-row">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel" style={{ height: 32 }} />
          ))}
        </div>
        <div className="tiles key">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tile skel" style={{ height: 88 }} />
          ))}
        </div>
        <div className="panel skel" style={{ height: 240 }} />
      </main>
    </>
  );
}
