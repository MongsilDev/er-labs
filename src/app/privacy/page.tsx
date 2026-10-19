import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { currentUser } from "@/server/auth";

export const metadata: Metadata = { title: "개인정보 처리방침" };

export default async function Privacy() {
  const user = await currentUser();
  return (
    <>
      <Header user={user} />
      <main id="main" className="wrap slim doc">
        <h1 className="page-h1">개인정보 처리방침</h1>
        <p className="sub">2026년 10월 19일 시행</p>
        <p>
          er.mongsil.dev ER Labs가 처리하는 개인정보를 개인정보 보호법 제30조에 따라 공개합니다. 개인이 운영하는 무료 서비스입니다.
        </p>

        <h2>1. 처리 목적</h2>
        <ul>
          <li>대회 순위 계산과 공유</li>
          <li>대회 운영자 로그인과 권한 확인</li>
          <li>남용 방지와 방문 통계</li>
        </ul>

        <h2>2. 처리 항목과 보유 기간</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">수집 시점</th>
                <th scope="col">보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>게임 닉네임, 실험체, 팀 이름, 경기 순위와 기록</td>
                <td>운영자가 경기 결과 CSV를 올릴 때</td>
                <td>대회 마지막 수정 24시간 뒤까지</td>
              </tr>
              <tr>
                <td>대회 이름, 감점, 날씨, 변경 기록과 변경한 운영자 이름</td>
                <td>운영자가 대회를 만들거나 바꿀 때</td>
                <td>대회 마지막 수정 24시간 뒤까지</td>
              </tr>
              <tr>
                <td>디스코드 ID, 사용자 이름, 프로필 사진 주소</td>
                <td>디스코드로 로그인할 때</td>
                <td>로그인 7일 뒤 또는 로그아웃, 운영하던 대회가 모두 지워질 때까지</td>
              </tr>
              <tr>
                <td>접속 IP 주소</td>
                <td>사이트에 접속할 때</td>
                <td>요청 횟수 제한에만 쓰고 저장하지 않음. 서버 메모리에서 1시간 안에 지워짐</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>디스코드 로그인은 사용자 식별 권한만 요청합니다. 디스코드 서버 목록, 메시지, 이메일은 받지 않고, 디스코드 접속 토큰은 저장하지 않습니다.</p>

        <h2>3. 파기</h2>
        <p>보유 기간이 지난 정보는 10분마다 자동으로 지우며 되살릴 수 없습니다. 대회 정보는 백업하지 않습니다.</p>

        <h2>4. 제3자 제공</h2>
        <p>개인정보를 다른 곳에 넘기거나 팔지 않습니다. 대회 코드를 아는 사람은 누구나 그 대회의 순위와 선수 기록을 볼 수 있습니다.</p>

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
        <p>
          디스코드로 로그인하면 미국 회사인 디스코드의 로그인 화면으로 이동하며, 몽실봇 디스코드 앱을 통해 로그인합니다. 위 국외 이전과 디스코드 로그인은 서비스 제공에
          필요한 처리 위탁이며, 개인정보 보호법 제28조의8 제1항 제3호에 따릅니다.
        </p>

        <h2>6. 쿠키와 브라우저 저장소</h2>
        <ul>
          <li>__Host-er_session: 로그인 유지, 최대 7일</li>
          <li>__Host-er_state: 디스코드 로그인 중 위조 요청 방지, 10분</li>
          <li>브라우저 저장소: 화면 테마, 이 브라우저에서 연 대회 목록, 로그인 전에 입력한 새 대회 설정</li>
        </ul>
        <p>광고나 추적 쿠키는 쓰지 않습니다. 쿠키를 막으면 운영자로 로그인할 수 없지만 대회는 볼 수 있습니다.</p>

        <h2>7. 정보주체의 권리</h2>
        <p>
          언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 로그인 정보는 로그아웃하면 바로 지워지고, 대회는 개최자가 대회 삭제로 바로 지울 수
          있습니다. 그 밖의 요구는 아래 이메일로 보내 주시면 본인 확인 뒤 바로 처리합니다. 만 14세 미만 아동의 권리는 법정대리인이 행사할 수 있습니다.
        </p>

        <h2>8. 개인정보 보호책임자</h2>
        <p>
          몽실, ER Labs 운영자
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
