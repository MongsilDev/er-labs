import type { NextRequest } from "next/server";
import { acceptInvite } from "@/server/tournament";
import { guardWrite, handle, json } from "@/server/http";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    const g = await guardWrite();
    if ("error" in g) return g.error;
    const { token } = await ctx.params;
    return json(acceptInvite(token, g.user));
  });
}
