"use client";

import { useLayoutEffect, useRef, useState } from "react";

// 서버 HTML은 폭을 몰라 initial 폭으로 그리므로 차트는 measured가 될 때까지 감춤
export function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w ?? initial, w !== null] as const;
}
