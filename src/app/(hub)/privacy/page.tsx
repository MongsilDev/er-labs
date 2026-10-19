import type { Metadata } from "next";
import HubFooter from "../HubFooter";
import HubHeader from "../HubHeader";

export const metadata: Metadata = { title: "개인정보 처리방침" };

const H3 = "mt-5 mb-2 text-[15px] font-bold";

export default function Privacy() {
  return (
    <>
      <HubHeader />
      <main id="main" className="wrap slim doc">
        <h1 className="mt-3 mb-[18px] text-[28px] font-extrabold tracking-[-0.5px]">개인정보 처리방침</h1>
        <p className="text-[14px] text-fg-3">2026년 10월 19일 시행</p>
        <p>
          labs.mongsil.dev가 처리하는 개인정보를 개인정보 보호법 제30조에 따라 공개합니다. 개인이 운영하는 무료 서비스이며, 이터널 리턴 도구와 Escape from Tarkov 도구가
          있습니다. 로그인은 이터널 리턴 대회 운영자만 씁니다.
        </p>

        <h2>1. 처리 목적</h2>
        <ul>
          <li>이터널 리턴 대회 순위 계산과 공유</li>
          <li>이터널 리턴 대회 운영자 로그인과 권한 확인</li>
          <li>Escape from Tarkov 계정 전적 조회와 판정 배지 계산</li>
          <li>Escape from Tarkov 닉네임 변경 이력과 전적 변화 기록</li>
          <li>남용 방지와 방문 통계</li>
        </ul>

        <h2>2. 처리 항목과 보유 기간</h2>
        <h3 className={H3}>이터널 리턴</h3>
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
            </tbody>
          </table>
        </div>
        <p>디스코드 로그인은 사용자 식별 권한만 요청합니다. 디스코드 서버 목록, 메시지, 이메일은 받지 않고, 디스코드 접속 토큰은 저장하지 않습니다.</p>

        <h3 className={H3}>Escape from Tarkov</h3>
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
            </tbody>
          </table>
        </div>
        <p>
          게임 기록은 tarkov.dev가 이미 공개한 정보입니다. 이 사이트는 Battlestate Games 서버에 직접 접속하지 않고, tarkov.dev에서 누군가 조회한 적 있는 계정의 공개
          기록만 받습니다.
        </p>

        <h3 className={H3}>공통</h3>
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
                <td>접속 IP 주소</td>
                <td>사이트에 접속할 때</td>
                <td>요청 횟수 제한에만 쓰고 저장하지 않음. 서버 메모리에서 1시간 안에 지워짐</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>3. 파기</h2>
        <p>
          이터널 리턴 대회와 로그인 정보는 보유 기간이 지나면 10분마다 자동으로 지우며, 따로 백업하지 않습니다. Escape from Tarkov 기록은 삭제 요청을 받으면 해당 계정의
          닉네임 변경 이력과 저장된 전적을 지우고, 이후 화면에 표시하지 않습니다. 지운 정보는 되살릴 수 없습니다.
        </p>

        <h2>4. 제3자 제공</h2>
        <p>
          개인정보를 다른 곳에 넘기거나 팔지 않습니다. 대회 코드를 아는 사람은 누구나 그 대회의 순위와 선수 기록을 볼 수 있고, 사이트에 표시되는 Escape from Tarkov
          전적은 누구나 볼 수 있습니다.
        </p>

        <h2>5. 처리 위탁과 국외 이전</h2>
        <div className="doc-table">
          <table>
            <thead>
              <tr>
                <th scope="col">받는 곳</th>
                <th scope="col" className="whitespace-nowrap">국가</th>
                <th scope="col">업무와 항목</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Sentry
                  <br />
                  <span className="whitespace-nowrap">compliance@sentry.io</span>
                </td>
                <td className="whitespace-nowrap">미국</td>
                <td>서버 오류 기록. 오류가 난 페이지 주소와 오류 내용이 서버 오류가 날 때 전송됨. 접속 IP 주소, 쿠키, 요청 내용은 보내지 않음. 보유 기간은 Sentry 보관 정책을 따름</td>
              </tr>
              <tr>
                <td>
                  Cloudflare
                  <br />
                  <span className="whitespace-nowrap">dpo@cloudflare.com</span>
                </td>
                <td className="whitespace-nowrap">미국</td>
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
          <li>__Host-er_session: 이터널 리턴 운영자 로그인 유지, 최대 7일</li>
          <li>__Host-er_state: 디스코드 로그인 중 위조 요청 방지, 10분</li>
          <li>브라우저 저장소: 화면 테마, 이 브라우저에서 연 대회 목록, 로그인 전에 입력한 새 대회 설정, 최근 본 Escape from Tarkov 계정 8개</li>
        </ul>
        <p>
          광고나 추적 쿠키는 쓰지 않고, 브라우저 저장소의 내용은 서버로 보내지 않습니다. 쿠키를 막으면 운영자로 로그인할 수 없지만 대회 보기와 계정 조회는 그대로 쓸 수
          있습니다. 최근 본 계정은 계정 조회 화면의 기록 지우기로 바로 지울 수 있습니다.
        </p>

        <h2>7. 정보주체의 권리</h2>
        <p>
          언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 로그인 정보는 로그아웃하면 바로 지워지고, 대회는 개최자가 대회 삭제로 바로 지울 수
          있습니다. Escape from Tarkov 기록은 아래 이메일로 계정 번호나 닉네임을 보내 주시면 게임 안에서 본인 계정임을 확인한 뒤 처리합니다. 그 밖의 요구도 아래 이메일로
          보내 주시면 본인 확인 뒤 바로 처리합니다. 만 14세 미만 아동의 권리는 법정대리인이 행사할 수 있습니다.
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
      <HubFooter />
    </>
  );
}
