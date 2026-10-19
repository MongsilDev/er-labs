import { NextResponse, type NextRequest } from "next/server";
import { BASE_URL, SESSION_COOKIE, STATE_COOKIE, cookieOptions, createSession, exchange, safeEqual, safeNext } from "@/er/server/auth";

export async function GET(req: NextRequest) {
  const saved = req.cookies.get(STATE_COOKIE)?.value ?? "";
  const [state, rawNext] = [saved.split("|")[0], saved.slice(saved.indexOf("|") + 1)];
  const next = safeNext(rawNext);
  const q = req.nextUrl.searchParams;
  const back = (path: string) => {
    const res = NextResponse.redirect(`${BASE_URL}${path}`);
    res.cookies.set(STATE_COOKIE, "", cookieOptions(0));
    return res;
  };
  if (q.get("error")) return back(next);
  const code = q.get("code");
  if (!state || !code || !safeEqual(state, q.get("state") ?? "")) return back("/er/score?login=failed");
  let user = null;
  try {
    user = await exchange(code);
  } catch (e) {
    console.warn("[로그인] 디스코드 요청 실패", e instanceof Error ? e.name : e);
  }
  if (!user) return back("/er/score?login=failed");
  const session = createSession(user);
  const res = back(next);
  res.cookies.set(SESSION_COOKIE, session.id, cookieOptions(session.maxAge));
  return res;
}
