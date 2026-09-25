import { cn, formatScore } from "@/lib/utils/format";

export function ExamStatusBadge({ status }: { status: string }) {
  const style =
    status === "open"
      ? { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500 animate-pulse" }
      : status === "closed"
        ? { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" }
        : { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" };
  const label = status === "open" ? "Đang mở" : status === "closed" ? "Đã đóng" : "Bản nháp";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1", style.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label}
    </span>
  );
}

// Màu điểm theo thang 10: xanh (≥8), xanh ngọc (≥6.5), vàng (≥5), đỏ (<5).
export function ScoreBadge({ score }: { score: number | string | null | undefined }) {
  const value = Number(score ?? 0);
  const tone =
    value >= 8
      ? "from-emerald-500 to-teal-500"
      : value >= 6.5
        ? "from-teal-500 to-cyan-500"
        : value >= 5
          ? "from-amber-400 to-orange-500"
          : "from-rose-500 to-pink-500";
  return (
    <span className={cn("inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white shadow-sm", tone)}>
      {formatScore(score)} điểm
    </span>
  );
}
