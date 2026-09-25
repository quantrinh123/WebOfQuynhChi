import { cn } from "@/lib/utils/format";

type Sticker = { char: string; className: string; rotate: number; delay: number; size?: string };

const PASTEL = [
  "bg-teal-100 text-teal-600 shadow-[0_5px_0_#99f6e4]",
  "bg-indigo-100 text-indigo-500 shadow-[0_5px_0_#c7d2fe]",
  "bg-amber-100 text-amber-600 shadow-[0_5px_0_#fde68a]",
  "bg-pink-100 text-pink-500 shadow-[0_5px_0_#fbcfe8]",
  "bg-sky-100 text-sky-600 shadow-[0_5px_0_#bae6fd]",
  "bg-violet-100 text-violet-500 shadow-[0_5px_0_#ddd6fe]"
];

// Bộ sticker dựng sẵn cho từng vị trí.
export const DECOR_PRESETS: Record<string, Sticker[]> = {
  banner: [
    { char: "∫", className: "right-[4%] top-[14%]", rotate: -12, delay: 0, size: "h-14 w-14 text-3xl" },
    { char: "π", className: "right-[17%] bottom-[12%] hidden sm:flex", rotate: 10, delay: 0.7 },
    { char: "√x", className: "right-[30%] top-[10%] hidden lg:flex", rotate: 6, delay: 1.4, size: "h-11 w-14 text-lg" },
    { char: "Σ", className: "right-[42%] bottom-[8%] hidden xl:flex", rotate: -8, delay: 2.1 },
    { char: "∞", className: "right-[9%] bottom-[-6%] hidden md:flex", rotate: 4, delay: 1 }
  ],
  hero: [
    { char: "∫", className: "right-3 top-3 lg:right-auto lg:left-[46%] lg:top-[14%]", rotate: -12, delay: 0, size: "h-14 w-14 text-3xl" },
    { char: "π", className: "hidden lg:flex left-[56%] bottom-[14%]", rotate: 10, delay: 0.7 },
    { char: "√x", className: "hidden lg:flex left-[38%] bottom-[8%]", rotate: 6, delay: 1.4, size: "h-11 w-14 text-lg" },
    { char: "Σ", className: "hidden xl:flex left-[62%] top-[8%]", rotate: -8, delay: 2.1, size: "h-11 w-11 text-xl" }
  ],
  result: [
    { char: "x²", className: "right-6 bottom-5", rotate: 8, delay: 0 },
    { char: "Δ", className: "right-24 bottom-12 hidden md:flex", rotate: -10, delay: 0.8, size: "h-10 w-10 text-lg" },
    { char: "θ", className: "left-[46%] top-4 hidden lg:flex", rotate: 12, delay: 1.6, size: "h-10 w-10 text-lg" },
    { char: "∞", className: "left-[58%] bottom-4 hidden lg:flex", rotate: -6, delay: 2.4, size: "h-10 w-12 text-xl" }
  ],
  corner: [
    { char: "x²", className: "right-5 top-5", rotate: 8, delay: 0 },
    { char: "Δ", className: "right-20 top-12 hidden sm:flex", rotate: -10, delay: 0.8, size: "h-10 w-10 text-lg" },
    { char: "θ", className: "right-8 bottom-6 hidden md:flex", rotate: 12, delay: 1.6, size: "h-10 w-10 text-lg" }
  ],
  header: [
    { char: "f(x)", className: "right-2 top-0", rotate: -6, delay: 0, size: "h-11 w-16 text-base" },
    { char: "π", className: "right-24 top-8 hidden sm:flex", rotate: 10, delay: 0.9 },
    { char: "∫", className: "right-44 -top-2 hidden md:flex", rotate: -12, delay: 1.7 }
  ]
};

// Sticker ký hiệu toán nhún nhảy để trang trí; "glass" dùng trên nền màu, "pastel" dùng trên nền sáng.
export function MathDecor({ preset, variant = "glass" }: { preset: keyof typeof DECOR_PRESETS; variant?: "glass" | "pastel" }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {DECOR_PRESETS[preset].map((sticker, index) => (
        <div key={sticker.char} className={cn("absolute", sticker.className)} style={{ transform: `rotate(${sticker.rotate}deg)` }}>
          <span
            className={cn(
              "animate-bob flex items-center justify-center rounded-2xl font-black",
              sticker.size ?? "h-12 w-12 text-2xl",
              variant === "glass" ? "border border-white/30 bg-white/15 text-white shadow-[0_5px_0_rgba(255,255,255,0.18)] backdrop-blur-sm" : cn("border-2 border-white", PASTEL[index % PASTEL.length])
            )}
            style={{ animationDelay: `${sticker.delay}s` }}
          >
            {sticker.char}
          </span>
        </div>
      ))}
    </div>
  );
}
