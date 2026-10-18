import { allow } from "@/server/limits";
import { createTournament } from "@/server/tournament";
import { fail, guardWrite, handle, json } from "@/server/http";
import type { CreateInput } from "@/lib/view";

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    if (!allow(`create:${g.user.id}`, 10, 60 * 60 * 1000)) return fail("대회는 한 시간에 10개까지 만들 수 있습니다. 잠시 뒤 다시 만들어주세요.", 429);
    const input = (await req.json()) as CreateInput;
    const code = createTournament(g.user, input);
    return json({ code });
  });
}
