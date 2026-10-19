import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InviteAccept from "@/components/InviteAccept";
import { MODE_LABEL } from "@/lib/rules";
import { currentUser } from "@/server/auth";
import { inviteInfo } from "@/server/tournament";
import Lines from "@/components/Lines";

export const metadata: Metadata = { title: "운영자 초대", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await currentUser();
  const info = inviteInfo(token);
  return (
    <>
      <Header user={user} login={false} />
      <main id="main" className="wrap slim">
        <section className="panel invite">
          {info ? (
            <>
              <p className="muted">{info.inviter}님의 초대</p>
              <h1>{info.name} 운영자</h1>
              <dl>
                <dt>대회 코드</dt>
                <dd translate="no">{info.code}</dd>
                <dt>진행 방식</dt>
                <dd>
                  {MODE_LABEL[info.mode]} {info.mode === "points" ? `${info.plannedRounds}라운드` : `최대 ${info.plannedRounds}라운드`}
                  {info.groupCount > 1 ? `, ${info.groupCount}개 조` : ""}
                </dd>
                {info.usesLeft > 1 && (
                  <>
                    <dt>남은 자리</dt>
                    <dd>{info.usesLeft}명</dd>
                  </>
                )}
                <dt>할 수 있는 일</dt>
                <dd>CSV 추가, 감점, 날씨, 팀 이름 정리</dd>
              </dl>
              <InviteAccept token={token} loggedIn={Boolean(user)} />
            </>
          ) : (
            <>
              <h1>쓸 수 없는 초대 링크입니다</h1>
              <p className="muted">
                <Lines text="인원이 다 찼거나 취소된 링크입니다. 개최자에게 새 링크를 요청해주세요." />
              </p>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
