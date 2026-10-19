"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";

export default function UserMenu({ name, avatar }: { name: string; avatar: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[18px] border border-line bg-surface pr-3 pl-1.5 text-[13px] font-semibold" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={name} src={avatar} />
        <span className="min-w-0 truncate" style={{ maxWidth: 120 }}>{name}</span>
      </button>
      {open && (
        <div className="menu-pop panel" role="menu">
          <a role="menuitem" href="/score">내 대회</a>
          <form method="post" action="/auth/logout">
            <button role="menuitem" type="submit">로그아웃</button>
          </form>
        </div>
      )}
    </div>
  );
}
