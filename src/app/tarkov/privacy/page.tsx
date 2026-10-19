import type { Metadata } from "next";
import Footer from "@/tarkov/components/Footer";
import Header from "@/tarkov/components/Header";

export const metadata: Metadata = { title: "개인정보 처리방침" };

export default function Privacy() {
  return (
    <>
      <Header />
      <main id="main" className="wrap slim doc">
        <h1 className="page-h1">개인정보 처리방침</h1>
        <p className="sub">2026년 10월 19일 시행</p>
        <p>labs.mongsil.dev의 Escape from Tarkov 도구가 처리하는 개인정보를 개인정보 보호법 제30조에 따라 공개합니다. 개인이 운영하는 무료 서비스이며 이 도구에는 로그인이 없습니다.</p>

        <h2>1. 처리 목적</h2>
        <ul>
          <li>Escape from Tarkov 계정 전적 조회와 판정 배지 계산</li>
          <li>닉네임 변경 이력과 전적 변화 기록</li>
          <li>남용 방지와 방문 통계</li>
        </ul>

        <h2>2. 처리 항목과 보유 기간</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">수집 경로</th>
                <th scope="col">보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>게임 계정 번호, 닉네임, 마지막 갱신 시각</td>
                <td>tarkov.dev가 공개하는 이름 목록, 하루 한 번</td>
                <td>tarkov.dev 목록에 있는 동안</td>
              </tr>
              <tr>
                <td>닉네임 변경 이력</td>
                <td>위 이름 목록을 전날 것과 비교</td>
                <td>삭제 요청이 있을 때까지</td>
              </tr>
              <tr>
                <td>전적 숫자, 진영, 레벨, 계정 등급, 업적 달성 시각, 플레이 시간</td>
                <td>tarkov.dev가 공개하는 계정 기록. 누군가 이 사이트에서 조회할 때와 판정 비교군을 만들 때</td>
                <td>삭제 요청이 있을 때까지. 장비와 아이템 정보는 저장하지 않음</td>
              </tr>
              <tr>
                <td>접속 IP 주소</td>
                <td>사이트에 접속할 때</td>
                <td>요청 횟수 제한에만 쓰고 저장하지 않음. 서버 메모리에서 1시간 안에 지워짐</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          게임 기록은 tarkov.dev가 이미 공개한 정보입니다. 이 사이트는 Battlestate Games 서버에 직접 접속하지 않고, tarkov.dev에서 누군가 조회한 적 있는 계정의 공개
          기록만 받습니다.
        </p>

        <h2>3. 파기</h2>
        <p>삭제 요청을 받으면 해당 계정의 닉네임 변경 이력과 저장된 전적을 지우고, 이후 화면에 표시하지 않습니다. 지운 정보는 되살릴 수 없습니다.</p>

        <h2>4. 제3자 제공</h2>
        <p>개인정보를 다른 곳에 넘기거나 팔지 않습니다. 사이트에 표시되는 전적은 누구나 볼 수 있습니다.</p>

        <h2>5. 처리 위탁과 국외 이전</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">받는 곳</th>
                <th scope="col" className="nowrap">국가</th>
                <th scope="col">업무와 항목</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Sentry
                  <br />
                  <span className="nowrap">compliance@sentry.io</span>
                </td>
                <td className="nowrap">미국</td>
                <td>서버 오류 기록. 오류가 난 페이지 주소와 오류 내용이 서버 오류가 날 때 전송됨. 접속 IP 주소, 쿠키, 요청 내용은 보내지 않음. 보유 기간은 Sentry 보관 정책을 따름</td>
              </tr>
              <tr>
                <td>
                  Cloudflare
                  <br />
                  <span className="nowrap">dpo@cloudflare.com</span>
                </td>
                <td className="nowrap">미국</td>
                <td>사이트 접속 중계와 방문 통계. 접속 IP 주소, 요청 정보, 방문한 페이지 주소, 브라우저 종류가 접속할 때마다 전송됨. 방문 통계는 쿠키를 쓰지 않음. 보유 기간은 Cloudflare 정책을 따름</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>위 국외 이전은 서비스 제공에 필요한 처리 위탁이며, 개인정보 보호법 제28조의8 제1항 제3호에 따릅니다.</p>

        <h2>6. 쿠키와 브라우저 저장소</h2>
        <p>이 도구는 쿠키를 쓰지 않습니다. 브라우저 저장소에는 화면 테마와 이 브라우저에서 최근 본 계정 8개를 저장하며, 서버로 보내지 않습니다. 계정 조회 화면의 기록 지우기로 바로 지울 수 있습니다.</p>

        <h2>7. 정보주체의 권리</h2>
        <p>
          언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 아래 이메일로 계정 번호나 닉네임을 보내 주시면, 게임 안에서 본인 계정임을 확인한 뒤
          처리합니다. 만 14세 미만 아동의 권리는 법정대리인이 행사할 수 있습니다.
        </p>

        <h2>8. 개인정보 보호책임자</h2>
        <p>
          몽실, Labs 운영자
          <br />
          <a href="mailto:mail@mongsil.dev">mail@mongsil.dev</a>
        </p>

        <h2>9. 권리 침해 상담</h2>
        <ul>
          <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
          <li>개인정보침해신고센터: 118, privacy.kisa.or.kr</li>
          <li>대검찰청: 1301, www.spo.go.kr</li>
          <li>경찰청: 182, ecrm.police.go.kr</li>
        </ul>

        <h2>10. 변경</h2>
        <p>처리방침이 바뀌면 이 페이지에 시행일과 함께 올립니다.</p>
      </main>
      <Footer />
    </>
  );
}
