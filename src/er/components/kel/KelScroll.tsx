"use client";

import { useLayoutEffect, useRef, useState } from "react";

// 표를 감싼 구역과 이름이 겹치지 않게 뒤에 '표'를 붙임. 폭을 넘는 표만 키보드 초점을 받고, 초점이 있는 동안은 그대로 둠
export default function KelScroll({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScrolls(el.scrollWidth > el.clientWidth || el === document.activeElement));
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`kel-scroll scroll-fade overflow-x-auto ${className}`}
      onBlur={(e) => setScrolls(e.currentTarget.scrollWidth > e.currentTarget.clientWidth)}
      role="region"
      aria-label={`${label} 표`}
      tabIndex={scrolls ? 0 : undefined}
    >
      {children}
    </div>
  );
}
