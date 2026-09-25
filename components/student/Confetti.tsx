"use client";

import { useEffect, useState } from "react";

const COLORS = ["#14b8a6", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#10b981"];
const PIECES = 70;

// Pháo giấy bung một lần khi mở trang (dùng cho kết quả điểm cao).
export function Confetti() {
  const [pieces, setPieces] = useState<Array<{ left: number; delay: number; duration: number; color: string; size: number; drift: number; rotate: number; round: boolean }>>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPieces(
      Array.from({ length: PIECES }, (_, index) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        color: COLORS[index % COLORS.length],
        size: 6 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 220,
        rotate: 360 + Math.random() * 720,
        round: Math.random() > 0.6
      }))
    );
    const timer = window.setTimeout(() => setPieces([]), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!pieces.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="animate-confetti absolute -top-4 block"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.45,
            background: piece.color,
            borderRadius: piece.round ? "9999px" : "2px",
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--drift" as string]: `${piece.drift}px`,
            ["--spin" as string]: `${piece.rotate}deg`
          }}
        />
      ))}
    </div>
  );
}
