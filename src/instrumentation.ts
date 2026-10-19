import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0,
      serverName: "macmini",
      // 사용자 정보, 쿠키, 헤더, 본문, 쿼리, 변수 값은 보내지 않음
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
      },
    });
  }
  const { cleanup } = await import("./server/tournament");
  const run = () => {
    try {
      const r = cleanup();
      if (r.tournaments || r.users) console.log(`[정리] 대회 ${r.tournaments}개, 세션 ${r.sessions}개, 사용자 ${r.users}명 삭제`);
    } catch (e) {
      console.error("[정리] 실패", e);
      import("@sentry/node").then((Sentry) => Sentry.captureException(e));
    }
  };
  run();
  setInterval(run, 10 * 60 * 1000).unref();
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/node");
  Sentry.captureException(err, { tags: { route: context.routePath, kind: context.routeType }, extra: { method: request.method } });
};
