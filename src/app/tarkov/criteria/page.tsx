import type { Metadata } from "next";
import Footer from "@/components/SiteFooter";
import Header from "@/tarkov/components/Header";
import { ALERT, MIN_N, MIN_PEERS, PAIR, PRIOR, TARGET_PEERS, WARN, WIDTHS } from "@/tarkov/lib/criteria";
import { int } from "@/tarkov/lib/format";
import { baselineCounts } from "@/tarkov/server/baseline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "판정 기준", description: "Escape from Tarkov 계정 판정 배지 계산 방식" };

export default function Criteria() {
  const counts = baselineCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pct = (q: number) => `${Math.round((1 - q) * 100)}%`;
  return (
    <>
      <Header crumb={{ href: "/tarkov/players", label: "계정 조회" }} />
      <main id="main" className="wrap slim doc">
        <h1 className="page-h1">판정 기준</h1>
        <p>
          판정 배지는 공개된 전적 숫자가 비슷한 계정들 사이에서 어디쯤인지를 나타냅니다.<br />통계 기준이며 부정행위의 증거가 아닙니다.<br />실력이 좋은 사람, 친구와 함께 다니는
          사람, 특정 맵만 도는 사람도 높게 나올 수 있습니다.
        </p>

        <h2>배지</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">배지</th>
                <th scope="col">조건</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="nowrap">특이점 없음</td>
                <td>확인 필요와 이상 수치 조건에 해당하지 않습니다.<br />지표 하나가 상위 {pct(WARN)}를 넘는 것만으로는 표시하지 않습니다.</td>
              </tr>
              <tr>
                <td className="nowrap">확인 필요</td>
                <td>지표 하나가 비교군 상위 {pct(ALERT)}를 넘거나, 서로 다른 묶음의 지표 두 개 이상이 상위 {pct(WARN)}를 넘습니다.</td>
              </tr>
              <tr>
                <td className="nowrap">이상 수치</td>
                <td>
                  상위 {pct(ALERT)}를 넘은 지표가 있고 서로 다른 묶음의 지표 두 개 이상이 상위 {pct(PAIR)}를 넘습니다.<br />또는 지표 하나가 상위 {pct(ALERT)} 값보다 상위{" "}
                  {pct(WARN)}와 {pct(ALERT)} 값의 차이만큼 더 높습니다.
                </td>
              </tr>
              <tr>
                <td className="nowrap">판정 불가</td>
                <td>
                  레이드나 경기가 {MIN_N}회 미만이거나, 비슷한 계정이 {MIN_PEERS}명보다 적습니다.
                </td>
              </tr>
              <tr>
                <td className="nowrap">공인 계정</td>
                <td>게임 계정 등급에 Sherpa, Emissary, Developer, 채팅 관리자 표시가 있습니다.<br />통계 판정과 따로 표시합니다.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>&quot;정상&quot;이라는 배지는 두지 않습니다.<br />공개 전적만으로는 정상임을 보증할 수 없기 때문입니다.</p>
        <p>2026년 10월 19일 기준으로 시즌, PvP, PvE 비교군 계정 전체에 이 기준을 적용하면 이상 수치는 2~3%, 확인 필요는 6% 안팎입니다.<br />아레나 비교군 계정 1,180개에서는 이상 수치가 3.8%, 확인 필요가 8.4%입니다.</p>

        <h2>비교군</h2>
        <p>
          고정된 기준값을 쓰지 않습니다.<br />같은 K/D라도 플레이 시간과 레이드 수에 따라 뜻이 다르기 때문입니다.<br />판정할 계정과 플레이 시간, 레이드 수가 모두 ±
          {Math.round(WIDTHS[0] * 100)}% 안인 계정을 먼저 찾고, {TARGET_PEERS}명이 안 되면 범위를{" "}
          {WIDTHS.slice(1)
            .map((w) => `±${Math.round(w * 100)}%`)
            .join(", ")}
          로 차례로 넓힙니다.<br />아레나는 모드마다 킬이 나오는 정도가 달라 모드별로 판정합니다.<br />{MIN_N}경기 이상 한 모드마다, 같은 모드를 경기 수가 비슷하게 한 계정과 비교합니다.<br />계정 배지는 이상 수치인 모드가 있고 판정한 다른 모드도 모두 확인 필요 이상일 때 이상 수치입니다.<br />이상 수치인 모드가 있거나, 판정한 모드의 절반이 넘게 확인 필요 이상이면 확인 필요입니다.
        </p>
        <p>
          비교군은 tarkov.dev에서 최근 30일 안에 갱신된 계정의 공개 전적을 천천히 받아 만듭니다.
          <br />
          {total > 0
            ? `지금 비교군은 PvP ${int(counts.pvp ?? 0)}명, 시즌 ${int(counts.season ?? 0)}명, PvE ${int(counts.pve ?? 0)}명, 아레나 ${int(counts.arena ?? 0)}명입니다.`
            : "지금은 비교군을 모으고 있습니다."}
          <br />
          tarkov.dev에서 조회된 계정만 들어가므로 전체 이용자를 대표하지는 않습니다.
        </p>

        <h2>지표</h2>
        <ul>
          <li>시즌, PvP, PvE: PMC K/D, 레이드당 PMC 사살, 생존율, 연속 생존 횟수</li>
          <li>아레나 모드별: K/D, 경기당 킬, 헤드샷 비율, 한 경기 최다 킬, 최고 연속 킬</li>
        </ul>
        <p>
          PMC K/D, 레이드당 PMC 사살, 생존율은 모두 사망 횟수에서 나와 함께 움직이므로 한 묶음으로 셉니다.<br />아레나의 K/D와 경기당 킬도 한 묶음입니다.<br />실력이 좋아 K/D와
          생존율이 함께 높은 계정이 묶음 두 개를 넘은 것으로 판정되지 않게 하려는 것입니다.
        </p>
        <p>
          레이드가 적은 계정은 몇 판의 운으로 숫자가 크게 흔들립니다.<br />그래서 비교하기 전에 비교군의 평균적인 기록 {PRIOR}판을 더한 보정값을 씁니다.<br />헤드샷 비율은 평균
          비율의 킬 100개를 더합니다.<br />계정 화면의 &quot;보정값&quot;이 이 값이고, 비교군도 같은 방식으로 보정한 뒤 상위 10%와 1% 값을 구합니다.<br />비교군 평균은 위아래 10%를
          잘라낸 평균입니다.
        </p>
        <p>
          EFT 플레이 시간은 시즌, PvP, PvE를 합친 계정 전체 값입니다.<br />아레나도 모드별 플레이 시간이 없습니다.<br />그래서 시간당 킬은 판정에 쓰지 않습니다.<br />이 방식은 tarkovstats.online이 공개한 계산 방식을
          참고했습니다.
        </p>

        <h2>데이터</h2>
        <p>
          모든 전적은 tarkov.dev가 공개하는 기록입니다.<br />기록은 누군가 tarkov.dev에서 그 계정을 열 때만 갱신되므로, 계정 화면의 기준 시각을 함께 확인해 주세요.<br />오래된
          기록은 계정 화면의 &quot;tarkov.dev에서 갱신&quot;으로 새로 받을 수 있습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
