"use client";

import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils/format";

export function ExamTimer({ secondsLeft }: { secondsLeft: number }) {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerLabel = secondsLeft > 0 ? `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : "Hết giờ";
  const urgent = secondsLeft <= 300;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold shadow-sm",
        urgent ? "bg-rose-600 text-white" : "bg-slate-950 text-white"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12">
        <Clock3 size={18} />
      </div>
      <div>
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/65">Thời gian</p>
        <p className="mt-0.5 text-lg leading-none">{timerLabel}</p>
      </div>
    </div>
  );
}
