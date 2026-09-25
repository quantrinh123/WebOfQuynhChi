"use client";

import { useEffect, useState } from "react";

// Số đếm từ 0 lên giá trị thật khi hiện ra. Giá trị không phải số (VD "-") thì hiện nguyên.
export function CountUp({ value, decimals = 0, duration = 900 }: { value: number | string; decimals?: number; duration?: number }) {
  const target = typeof value === "number" ? value : Number.NaN;
  const [current, setCurrent] = useState(Number.isFinite(target) ? 0 : target);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setCurrent(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  if (!Number.isFinite(target)) return <>{value}</>;
  const rounded = Number(current.toFixed(decimals));
  return <>{Number.isInteger(rounded) ? rounded : rounded.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "")}</>;
}
