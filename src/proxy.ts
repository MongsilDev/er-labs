import { NextResponse, type NextRequest } from "next/server";

// 프로필은 loading.tsx 때문에 200으로 먼저 스트리밍되므로, 형식이 틀린 계정 번호는 프로필과 미리보기 이미지 모두 여기서 404 페이지로 응답
export function proxy(req: NextRequest) {
  const aid = req.nextUrl.pathname.split("/")[3] ?? "";
  if (/^\d{1,10}$/.test(aid) && Number(aid) > 0) return NextResponse.next();
  return NextResponse.rewrite(new URL("/tarkov/_404", req.url));
}

export const config = { matcher: ["/tarkov/players/:aid", "/tarkov/players/:aid/og"] };
