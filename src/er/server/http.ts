import "server-only";
import { captureException } from "@sentry/node";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { currentUser, sameOrigin, type User } from "./auth";
import { allow } from "./limits";
import { OpError } from "./tournament";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const fail = (message: string, status = 400) => json({ error: message }, status);

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export const MAX_BODY = 6 * 1024 * 1024;

export async function guardWrite(): Promise<{ user: User } | { error: Response }> {
  if (!(await sameOrigin())) return { error: fail("다른 사이트에서 보낸 요청은 받지 않습니다.", 403) };
  const length = Number((await headers()).get("content-length") ?? 0);
  if (length > MAX_BODY) return { error: fail("한 번에 올릴 수 있는 크기를 넘었습니다. 파일을 나눠서 올려주세요.", 413) };
  const user = await currentUser();
  if (!user) return { error: fail("디스코드로 로그인해주세요.", 401) };
  if (!allow(`w:${user.id}`, 120, 60_000)) return { error: fail("요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.", 429) };
  return { user };
}

export function handle(fn: () => Response | Promise<Response>): Promise<Response> {
  return Promise.resolve()
    .then(fn)
    .catch((e: unknown) => {
      if (e instanceof OpError) return fail(e.message, 400);
      if (e instanceof SyntaxError) return fail("요청 형식이 잘못됐습니다.", 400);
      console.error("[서버] 처리 실패", e);
      captureException(e);
      return fail("서버에서 처리하지 못했습니다. 잠시 뒤 다시 시도해주세요.", 500);
    });
}

export async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new SyntaxError("too large");
  return JSON.parse(text) as T;
}
