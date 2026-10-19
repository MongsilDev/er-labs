import { clientIp, fail, handle, json } from "@/server/http";
import { allow } from "@/server/limits";
import { search } from "@/server/profiles";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handle(async () => {
    if (!allow(`s:${await clientIp()}`, 120, 60_000)) return fail("요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.", 429);
    const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 32);
    return json({ results: search(q) });
  });
}
