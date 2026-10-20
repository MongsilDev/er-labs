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
  const { cleanup } = await import("./er/server/tournament");
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

  if (process.env.JOBS === "0") return;
  const { runIndex } = await import("./tarkov/server/indexer");
  const { crawl, refreshRates } = await import("./tarkov/server/baseline");
  // If-Modified-Since로 확인해 바뀐 색인만 받음
  const tick = async () => {
    await runIndex();
    await crawl();
  };
  setTimeout(tick, 5_000).unref();
  setInterval(tick, 30 * 60 * 1000).unref();
  // 비교군 수집이 몇 시간씩 이어질 수 있어 따로 돌림. 계산할 때인지는 refreshRates가 판단
  setTimeout(refreshRates, 60_000).unref();
  setInterval(refreshRates, 60 * 60 * 1000).unref();
}

const toolOf = (path: string) =>
  /^\/(er|auth|api\/(t|i|me))(\/|$)/.test(path) ? "er" : /^\/(tarkov|api\/(search|players|icon))(\/|$)/.test(path) ? "tarkov" : "labs";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/node");
  Sentry.captureException(err, { tags: { route: context.routePath, kind: context.routeType, tool: toolOf(context.routePath) }, extra: { method: request.method } });
};
