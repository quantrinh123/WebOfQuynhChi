import Link from "next/link";
import { ArrowRight, Award, CalendarCheck, CheckCircle2, EyeOff, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { MathDecor } from "@/components/student/MathDecor";
import { ScoreRing } from "@/components/student/ScoreRing";
import { PageHeader } from "@/components/layout/PageHeader";
import { CountUp } from "@/components/student/CountUp";
import { StudentEmpty } from "@/components/student/StudentEmpty";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatScore } from "@/lib/utils/format";

export default async function StudentResultsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, exams(title, duration_minutes, total_score, show_score_after_submit)")
    .eq("student_id", student.id)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });

  const rows = (submissions ?? []).map((submission: any) => {
    const max = Number(submission.exams?.total_score || 10);
    const score = Number(submission.final_score ?? 0);
    return { submission, max, score, score10: (score / max) * 10, visible: Boolean(submission.exams?.show_score_after_submit) };
  });
  const visible = rows.filter((row) => row.visible);
  const average = visible.length ? visible.reduce((sum, row) => sum + row.score10, 0) / visible.length : null;
  const best = visible.length ? Math.max(...visible.map((row) => row.score10)) : null;
  // Xu hướng: bài gần nhất so với bài trước đó (danh sách đang xếp mới nhất trước).
  const trend = visible.length >= 2 ? visible[0].score10 - visible[1].score10 : null;

  return (
    <>
      <div className="relative">
        <MathDecor preset="header" variant="pastel" />
        <PageHeader title="Kết quả của bạn" description="Điểm số và xếp hạng qua từng bài thi." />
      </div>
      {!rows.length ? <StudentEmpty title="Chưa có kết quả" description="Bạn chưa nộp bài thi nào." /> : null}

      {rows.length ? (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={CheckCircle2} tone="from-teal-500 to-cyan-500" label="Bài đã nộp" value={rows.length} />
          <SummaryTile icon={Award} tone="from-violet-500 to-fuchsia-500" label="Điểm trung bình" value={average === null ? "-" : Math.round(average * 100) / 100} decimals={2} suffix="/10" />
          <SummaryTile icon={Flame} tone="from-amber-400 to-orange-500" label="Điểm cao nhất" value={best === null ? "-" : Math.round(best * 100) / 100} decimals={2} suffix="/10" />
          <SummaryTile
            icon={trend !== null && trend < 0 ? TrendingDown : TrendingUp}
            tone={trend !== null && trend < 0 ? "from-rose-500 to-pink-500" : "from-emerald-500 to-teal-500"}
            label="So với bài trước"
            value={trend === null ? "-" : `${trend >= 0 ? "+" : "−"}${formatScore(Math.round(Math.abs(trend) * 100) / 100)}`}
          />
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map(({ submission, max, score, visible: showScore }, index) => (
          <Link
            key={submission.id}
            href={`/student/exams/${submission.exam_id}/result`}
            className="surface animate-rise-in group flex items-center gap-5 p-5 transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_24px_50px_-24px_rgba(13,148,136,0.45)]"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {showScore ? (
              <ScoreRing id={submission.id} score={score} max={max} size={84} stroke={3.4} />
            ) : (
              <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <EyeOff size={28} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 font-black leading-snug text-slate-950">{submission.exams?.title}</h2>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarCheck size={13} />
                {formatDateTime(submission.submitted_at)}
              </p>
              <p className={cn("mt-1 text-xs font-bold", showScore ? "text-teal-700" : "text-slate-400")}>{showScore ? "Xem chi tiết & xếp hạng" : "Chưa công bố điểm"}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600" />
          </Link>
        ))}
      </div>
    </>
  );
}

function SummaryTile({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
  decimals = 0
}: {
  icon: React.ElementType;
  tone: string;
  label: string;
  value: number | string;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div className="surface animate-rise-in p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", tone)}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        <CountUp value={value} decimals={decimals} />
        {suffix && value !== "-" ? <span className="ml-0.5 text-base font-bold text-slate-400">{suffix}</span> : null}
      </p>
    </div>
  );
}
