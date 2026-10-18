import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_ID, STATE_COOKIE, authorizeUrl, cookieOptions, safeNext, token } from "@/server/auth";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) return new NextResponse("디스코드 로그인이 설정되지 않았습니다.", { status: 503 });
  const state = token(24);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set(STATE_COOKIE, `${state}|${next}`, cookieOptions(600));
  return res;
}
