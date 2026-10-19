import type { Metadata } from "next";
import Footer from "@/components/SiteFooter";
import Header from "@/tarkov/components/Header";
import { ALERT, METRICS, MIN_N, MIN_PEERS, PAIR, PRIOR, SMOOTHED, TARGET_PEERS, VERDICT_LABEL, WARN, WIDTHS, type Kind } from "@/tarkov/lib/criteria";
import { int } from "@/tarkov/lib/format";
import { baselineCounts } from "@/tarkov/server/baseline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "판정 기준", description: "Escape from Tarkov 계정 판정 배지 계산 방식" };

const pct = (q: number) => `${Math.round((1 - q) * 100)}%`;

const FAMILY: Record<Kind, Record<string, string>> = {
  eft: { combat: "전투", streak: "연속 생존" },
  arena: { kill: "킬", hs: "헤드샷", maxkills: "최다 킬", streak: "연속 킬" },
};

// 2026-10-19 운영 비교군 전체에 판정을 돌린 결과
const RATES = {
  clear: ["91%", "88%"],
  warn: ["6%", "8%"],
  alert: ["2~3%", "4%"],
} as const;

function Metrics({ kind }: { kind: Kind }) {
  return (
    <div className="doc-table">
      <table>
        <thead>
          <tr>
            <th scope="col">지표</th>
            <th scope="col">묶음</th>
            <th scope="col">비교 값</th>
          </tr>
        </thead>
        <tbody>
          {METRICS[kind].map((m) => (
            <tr key={m.key}>
              <td className="nowrap">{m.label}</td>
              <td className="nowrap">{FAMILY[kind][m.family]}</td>
              <td>{SMOOTHED.has(m.key) ? "보정값" : "기록 그대로"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Criteria() {
  const counts = baselineCounts();
  const widths = WIDTHS.map((w) => `±${Math.round(w * 100)}%`);
  return (
    <>
      <Header crumb={{ href: "/tarkov/players", label: "계정 조회" }} />
      <main id="main" className="wrap slim doc">
        <h1 className="page-h1">판정 기준</h1>
        <p>
          판정 배지는 공개 전적이 비슷한 계정들 사이에서 어디쯤인지 보여 줍니다.
          <br />
          통계 기준이며 부정행위의 증거가 아닙니다.
          <br />
          실력이 좋거나, 친구와 함께 다니거나, 특정 맵만 도는 계정도 높게 나올 수 있습니다.
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
                <td className="nowrap">
                  <span className="badge sm">{VERDICT_LABEL.clear}</span>
                </td>
                <td>아래 두 조건에 해당하지 않음</td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="badge sm warn">{VERDICT_LABEL.warn}</span>
                </td>
                <td>
                  지표 하나가 상위 {pct(ALERT)}를 넘음
                  <br />
                  또는 서로 다른 묶음의 지표 2개가 상위 {pct(WARN)}를 넘음
                </td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="badge sm alert">{VERDICT_LABEL.alert}</span>
                </td>
                <td>
                  상위 {pct(ALERT)}를 넘은 지표가 있고, 서로 다른 묶음의 지표 2개가 상위 {pct(PAIR)}를 넘음
                  <br />
                  또는 지표 하나가 상위 {pct(ALERT)} 값을 크게 넘음
                </td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="badge sm none">{VERDICT_LABEL.none}</span>
                </td>
                <td>
                  레이드나 경기가 {MIN_N}회 미만
                  <br />
                  또는 비슷한 계정이 {MIN_PEERS}명 미만
                </td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="chip official">공인 계정</span>
                </td>
                <td>
                  계정 등급이 Sherpa, Emissary, Developer, 채팅 관리자
                  <br />
                  통계 판정과 따로 표시
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="doc-note">
          &quot;크게 넘음&quot;은 상위 {pct(ALERT)} 값에 상위 {pct(WARN)}와 {pct(ALERT)} 값의 차이를 더한 값보다 높다는 뜻입니다.
          <br />
          공개 전적만으로는 정상임을 보증할 수 없어서 &quot;정상&quot; 배지는 두지 않습니다.
        </p>

        <h3>비교군에 적용한 비율</h3>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">배지</th>
                <th scope="col" className="num nowrap">
                  시즌, PvP, PvE
                </th>
                <th scope="col" className="num nowrap">
                  아레나
                </th>
              </tr>
            </thead>
            <tbody>
              {(["clear", "warn", "alert"] as const).map((k) => (
                <tr key={k}>
                  <td className="nowrap">
                    <span className={k === "clear" ? "badge sm" : `badge sm ${k}`}>{VERDICT_LABEL[k]}</span>
                  </td>
                  <td className="num nowrap">{RATES[k][0]}</td>
                  <td className="num nowrap">{RATES[k][1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="doc-note">2026년 10월 19일 비교군 계정 전체에 이 기준을 적용한 결과입니다.</p>

        <h2>지표</h2>
        <h3>시즌, PvP, PvE</h3>
        <Metrics kind="eft" />
        <h3>아레나 모드별</h3>
        <Metrics kind="arena" />
        <p>
          같은 묶음의 지표는 같은 기록에서 나와 함께 움직이므로 하나로 셉니다.
          <br />
          보정값은 비교군의 평균적인 기록 {PRIOR}판을 더한 값이고, 헤드샷 비율에는 평균 비율의 킬 100개를 더합니다.
          <br />
          기록이 적은 계정의 숫자가 몇 판의 운으로 크게 흔들리지 않게 하기 위해서입니다.
          <br />
          EFT 플레이 시간은 세 모드를 합친 값이고 아레나는 모드별 플레이 시간이 없어서, 시간당 킬은 쓰지 않습니다.
        </p>

        <h2>비교군</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">모드</th>
                <th scope="col">비슷한 계정의 기준</th>
                <th scope="col" className="num nowrap">
                  계정
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["시즌", "season"],
                  ["PvP", "pvp"],
                  ["PvE", "pve"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <td className="nowrap">{label}</td>
                  <td>레이드 수와 플레이 시간</td>
                  <td className="num">{int(counts[key] ?? 0)}</td>
                </tr>
              ))}
              <tr>
                <td className="nowrap">아레나</td>
                <td>같은 모드의 경기 수</td>
                <td className="num">{int(counts.arena ?? 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          범위는 {widths[0]}에서 시작해 비슷한 계정이 {TARGET_PEERS}명이 될 때까지 {widths.slice(1).join(", ")}로 넓힙니다.
          <br />
          비교군은 tarkov.dev에서 최근 30일 안에 갱신된 계정의 공개 전적으로 만듭니다.
          <br />
          tarkov.dev에서 조회된 적 있는 계정만 들어가므로 전체 이용자를 대표하지는 않습니다.
        </p>

        <h2>아레나 계정 배지</h2>
        <p>아레나는 모드마다 킬이 나오는 정도가 달라서, {MIN_N}경기 이상 한 모드마다 따로 판정한 뒤 합칩니다.</p>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">계정 배지</th>
                <th scope="col">모드별 판정</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="nowrap">
                  <span className="badge sm alert">{VERDICT_LABEL.alert}</span>
                </td>
                <td>이상 수치인 모드가 있고, 판정한 모드가 모두 확인 필요 이상</td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="badge sm warn">{VERDICT_LABEL.warn}</span>
                </td>
                <td>
                  이상 수치인 모드가 있음
                  <br />
                  또는 판정한 모드의 절반 넘게 확인 필요 이상
                </td>
              </tr>
              <tr>
                <td className="nowrap">
                  <span className="badge sm">{VERDICT_LABEL.clear}</span>
                </td>
                <td>그 밖의 경우</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>데이터</h2>
        <p>
          모든 전적은 tarkov.dev가 공개하는 기록입니다.
          <br />
          기록은 누군가 tarkov.dev에서 그 계정을 열 때만 갱신되므로, 계정 화면의 기준 시각을 함께 확인해 주세요.
          <br />
          계산 방식은 tarkovstats.online이 공개한 방식을 참고했습니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
