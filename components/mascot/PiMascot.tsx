"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/format";

// Nhân vật chữ π: nhún nhảy, chớp mắt, mắt nhìn theo con chuột.
export function PiMascot({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = svg.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.max(1, Math.hypot(dx, dy));
        svg.style.setProperty("--eye-x", String((dx / distance) * Math.min(1, distance / 200)));
        svg.style.setProperty("--eye-y", String((dy / distance) * Math.min(1, distance / 200)));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const pupil = { transform: "translate(calc(var(--eye-x, 0) * 5px), calc(var(--eye-y, 0) * 4px))", transition: "transform 0.2s ease-out" };
  return (
    <svg ref={ref} viewBox="0 0 140 110" className={cn("animate-mascot drop-shadow-[0_10px_12px_rgba(20,184,166,0.35)]", className)} aria-hidden>
      <defs>
        <linearGradient id="pi-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="34" y="40" width="22" height="66" rx="11" fill="url(#pi-body)" />
      <path d="M 84 40 L 106 40 L 106 84 Q 106 96 118 96 Q 124 96 124 102 Q 124 108 116 108 Q 84 108 84 84 Z" fill="url(#pi-body)" />
      <rect x="6" y="6" width="128" height="44" rx="22" fill="url(#pi-body)" />
      <ellipse cx="38" cy="36" rx="7" ry="4.5" fill="#fda4af" opacity="0.7" />
      <ellipse cx="102" cy="36" rx="7" ry="4.5" fill="#fda4af" opacity="0.7" />
      <g className="animate-blink" style={{ transformOrigin: "70px 24px" }}>
        <circle cx="52" cy="24" r="10" fill="white" />
        <circle cx="88" cy="24" r="10" fill="white" />
        <g style={pupil}>
          <circle cx="53" cy="25" r="5" fill="#0f172a" />
          <circle cx="89" cy="25" r="5" fill="#0f172a" />
          <circle cx="55" cy="23" r="1.8" fill="white" />
          <circle cx="91" cy="23" r="1.8" fill="white" />
        </g>
      </g>
      <path d="M 62 37 Q 70 44 78 37" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
