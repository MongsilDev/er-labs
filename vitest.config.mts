import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  // next build의 standalone 출력에 테스트 파일 사본이 들어가는 일이 있어 빌드 결과는 읽지 않음
  test: { environment: "node", exclude: [...configDefaults.exclude, ".next/**"] },
});
