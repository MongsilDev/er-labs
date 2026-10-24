import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 빌드한 서버를 실행해 브라우저로 화면을 점검. pnpm test와 분리
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  // it.concurrent 화면 점검이 동시에 여는 페이지 수, Mac mini 메모리 기준
  test: { environment: "node", include: ["test/**/ui/**/*.ui.ts"], testTimeout: 180_000, hookTimeout: 120_000, maxConcurrency: 4 },
});
