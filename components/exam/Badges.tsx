import { cn, formatScore } from "@/lib/utils/format";

export function ExamStatusBadge({ status }: { status: string }) {
  const color = status === "open" ? "bg-emerald-100 text-emerald-800" : status === "closed" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800";
  const label = status === "open" ? "Đang mở" : status === "closed" ? "Đã đóng" : "Bản nháp";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", color)}>{label}</span>;
}

export function ScoreBadge({ score }: { score: number | string | null | undefined }) {
  return <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">{formatScore(score)} điểm</span>;
}
