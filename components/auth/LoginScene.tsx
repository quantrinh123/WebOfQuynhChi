"use client";

import { useRef } from "react";
import { CheckCircle2, Trophy } from "lucide-react";
import { PiMascot } from "@/components/mascot/PiMascot";
import { cn } from "@/lib/utils/format";

// Sticker ký hiệu toán quanh form (vị trí cố định để server và client render giống nhau).
const STICKERS = [
  { char: "∫", className: "left-[6%] top-[12%]", tone: "bg-teal-100 text-teal-600 shadow-[0_6px_0_#99f6e4]", rotate: -12, delay: 0, size: "h-16 w-16 text-4xl" },
  { char: "π", className: "right-[8%] top-[10%]", tone: "bg-indigo-100 text-indigo-500 shadow-[0_6px_0_#c7d2fe]", rotate: 10, delay: 0.6, size: "h-14 w-14 text-3xl" },
  { char: "√x", className: "left-[12%] bottom-[14%]", tone: "bg-amber-100 text-amber-600 shadow-[0_6px_0_#fde68a]", rotate: 8, delay: 1.2, size: "h-14 w-16 text-2xl" },
  { char: "Σ", className: "right-[12%] bottom-[12%]", tone: "bg-pink-100 text-pink-500 shadow-[0_6px_0_#fbcfe8]", rotate: -8, delay: 0.3, size: "h-16 w-16 text-4xl" },
  { char: "∞", className: "left-[24%] top-[6%] hidden md:flex", tone: "bg-sky-100 text-sky-600 shadow-[0_6px_0_#bae6fd]", rotate: 6, delay: 1.8, size: "h-12 w-14 text-3xl" },
  { char: "x²", className: "right-[26%] bottom-[5%] hidden md:flex", tone: "bg-emerald-100 text-emerald-600 shadow-[0_6px_0_#a7f3d0]", rotate: -6, delay: 2.2, size: "h-12 w-14 text-2xl" },
  { char: "Δ", className: "left-[3%] top-[48%] hidden lg:flex", tone: "bg-violet-100 text-violet-500 shadow-[0_6px_0_#ddd6fe]", rotate: 12, delay: 0.9, size: "h-12 w-12 text-2xl" },
  { char: "θ", className: "right-[4%] top-[45%] hidden lg:flex", tone: "bg-orange-100 text-orange-500 shadow-[0_6px_0_#fed7aa]", rotate: -10, delay: 1.5, size: "h-12 w-12 text-2xl" },
  { char: "f(x)", className: "left-[30%] bottom-[4%] hidden lg:flex", tone: "bg-cyan-100 text-cyan-600 shadow-[0_6px_0_#a5f3fc]", rotate: -4, delay: 2.6, size: "h-11 w-16 text-lg" },
  { char: "÷", className: "right-[30%] top-[4%] hidden lg:flex", tone: "bg-rose-100 text-rose-500 shadow-[0_6px_0_#fecdd3]", rotate: 8, delay: 3, size: "h-11 w-11 text-2xl" }
];

const PARABOLA = "M 60 60 Q 500 1000 940 60";
const WAVE = "M 0 520 C 120 440, 220 440, 340 520 S 560 600, 680 520 S 900 440, 1000 520";

export function LoginScene({ children }: { children: React.ReactNode }) {
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Cả khung cảnh (và mắt nhân vật) dịch nhẹ theo con chuột.
  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.style.setProperty("--mx", String(event.clientX / window.innerWidth - 0.5));
    scene.style.setProperty("--my", String(event.clientY / window.innerHeight - 0.5));
  }

  return (
    <div
      ref={sceneRef}
      onPointerMove={handlePointerMove}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-teal-50 px-5 py-16 [--mx:0] [--my:0]"
    >
      {/* Đốm màu pastel trôi nhẹ */}
      <div className="animate-aurora-a pointer-events-none absolute -left-32 -top-32 h-[460px] w-[460px] rounded-full bg-teal-200/60 blur-[100px]" />
      <div className="animate-aurora-b pointer-events-none absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-200/60 blur-[110px]" />
      <div className="animate-aurora-c pointer-events-none absolute right-1/4 top-0 h-[320px] w-[320px] rounded-full bg-pink-200/50 blur-[100px]" />
      <div className="animate-aurora-a pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-amber-100/70 blur-[100px]" style={{ animationDirection: "reverse" }} />

      {/* Lưới toạ độ + đồ thị tự vẽ */}
      <div className="parallax-layer pointer-events-none absolute inset-0" style={{ ["--depth" as string]: "-12px" }}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <g stroke="rgba(15,23,42,0.08)" strokeWidth="1.5">
            <line x1="0" y1="500" x2="1000" y2="500" />
            <line x1="500" y1="0" x2="500" y2="1000" />
          </g>
          <path d={PARABOLA} fill="none" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" pathLength={1} className="animate-draw" />
          <path d={WAVE} fill="none" stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" pathLength={1} className="animate-draw" style={{ animationDelay: "2.5s" }} />
          <circle r="9" fill="#14b8a6" stroke="white" strokeWidth="3">
            <animateMotion dur="7s" repeatCount="indefinite" path={PARABOLA} keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
          </circle>
          <circle r="8" fill="#818cf8" stroke="white" strokeWidth="3">
            <animateMotion dur="8s" repeatCount="indefinite" path={WAVE} keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
          </circle>
        </svg>
      </div>

      {/* Sticker ký hiệu toán */}
      <div className="parallax-layer pointer-events-none absolute inset-0" style={{ ["--depth" as string]: "26px" }}>
        {STICKERS.map((sticker) => (
          <div key={sticker.char} className={cn("absolute", sticker.className)} style={{ transform: `rotate(${sticker.rotate}deg)` }}>
            <span
              className={cn("animate-bob flex items-center justify-center rounded-2xl border-2 border-white font-black", sticker.size, sticker.tone)}
              style={{ animationDelay: `${sticker.delay}s` }}
            >
              {sticker.char}
            </span>
          </div>
        ))}

        {/* Thẻ mini minh hoạ */}
        <div className="absolute left-[7%] top-[30%] hidden xl:block" style={{ transform: "rotate(-6deg)" }}>
          <div className="animate-bob flex items-center gap-3 rounded-2xl border-2 border-white bg-white/90 px-4 py-3 shadow-[0_8px_0_#ccfbf1,0_20px_40px_-20px_rgba(15,23,42,0.3)]" style={{ animationDelay: "0.4s" }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={22} />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-500">Đã chấm xong</p>
              <p className="text-lg font-black text-slate-900">8,75 điểm</p>
            </div>
          </div>
        </div>
        <div className="absolute right-[7%] top-[62%] hidden xl:block" style={{ transform: "rotate(5deg)" }}>
          <div className="animate-bob flex items-center gap-3 rounded-2xl border-2 border-white bg-white/90 px-4 py-3 shadow-[0_8px_0_#fef3c7,0_20px_40px_-20px_rgba(15,23,42,0.3)]" style={{ animationDelay: "1.4s" }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Trophy size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-500">Xếp hạng lớp</p>
              <p className="text-lg font-black text-slate-900">#2 / 35</p>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ đăng nhập + nhân vật π */}
      <div className="parallax-layer relative z-10 w-full max-w-md" style={{ ["--depth" as string]: "-6px" }}>
        <div className="absolute -top-[88px] left-1/2 -translate-x-1/2">
          <PiMascot className="h-[104px] w-[132px]" />
        </div>
        <div className="animate-page rounded-[28px] border-2 border-white bg-white/85 p-8 pt-10 shadow-[0_10px_0_rgba(20,184,166,0.15),0_40px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10 sm:pt-12">
          {children}
        </div>
      </div>
    </div>
  );
}
