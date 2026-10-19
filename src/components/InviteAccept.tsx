"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import Lines from "./Lines";

export default function InviteAccept({ token, loggedIn }: { token: string; loggedIn: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!loggedIn) {
    return (
      <a className="btn discord lg block" href={`/auth/login?next=${encodeURIComponent(`/i/${token}`)}`}>
        디스코드로 로그인하고 수락
      </a>
    );
  }
  return (
    <>
      {error && (
        <p className="err" role="alert">
          <Lines text={error} />
        </p>
      )}
      <button
        type="button"
        className="btn primary lg block"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api.accept(token);
            router.push(`/t/${r.code}/a`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "수락하지 못했습니다.");
            setBusy(false);
          }
        }}
      >
        운영자로 참여
      </button>
    </>
  );
}
