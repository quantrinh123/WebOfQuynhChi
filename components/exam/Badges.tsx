import { cn, formatScore } from "@/lib/utils/format";

export function ExamStatusBadge({ status }: { status: string }) {
  const color =
    status === "open"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : status === "closed"
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-amber-100 text-amber-800 ring-amber-200";
  const label = status === "open" ? "Đang mở" : status === "closed" ? "Đã đóng" : "Bản nháp";

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", color)}>{label}</span>;
}

export function ScoreBadge({ score }: { score: number | string | null | undefined }) {
  return <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900 ring-1 ring-teal-200">{formatScore(score)} điểm</span>;
}
