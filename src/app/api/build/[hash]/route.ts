import { readBuild } from "@/tarkov/server/builds";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^[0-9a-f]{20}$/.test(hash)) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(readBuild(hash)), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=2592000, immutable" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
