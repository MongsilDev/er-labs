export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { cleanup } = await import("./server/tournament");
  const run = () => {
    try {
      const r = cleanup();
      if (r.tournaments || r.users) console.log(`[정리] 대회 ${r.tournaments}개, 세션 ${r.sessions}개, 사용자 ${r.users}명 삭제`);
    } catch (e) {
      console.error("[정리] 실패", e);
    }
  };
  run();
  setInterval(run, 10 * 60 * 1000).unref();
}
