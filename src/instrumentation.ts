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
  if (process.env.JOBS === "0") return;
  const { runIndex } = await import("./server/indexer");
  const { crawl } = await import("./server/baseline");
  // If-Modified-Since로 확인해 바뀐 색인만 받음
  const tick = async () => {
    await runIndex();
    await crawl();
  };
  setTimeout(tick, 5_000).unref();
  setInterval(tick, 30 * 60 * 1000).unref();
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/node");
  Sentry.captureException(err, { tags: { route: context.routePath, kind: context.routeType }, extra: { method: request.method } });
};
