import Link from "next/link";
import { CalendarCheck, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/exam/Badges";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

export default async function StudentResultsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, exams(title, duration_minutes, show_score_after_submit)")
    .eq("student_id", student.id)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });

  return (
    <>
      <PageHeader title="Kết quả" description="Các bài thi bạn đã nộp và kết quả chấm điểm." />
      {!submissions?.length ? <EmptyState title="Chưa có kết quả" description="Bạn chưa nộp bài thi nào." /> : null}

      <div className="grid gap-4">
        {submissions?.map((submission: any) => (
          <article key={submission.id} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-950">{submission.exams?.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <CalendarCheck size={15} />
                  Nộp lúc {formatDateTime(submission.submitted_at)} - {submission.exams?.duration_minutes} phút
                </p>
                <div className="mt-3">
                  {submission.exams?.show_score_after_submit ? (
                    <ScoreBadge score={submission.final_score} />
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Chưa công bố điểm</span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/student/exams/${submission.exam_id}/result`}>
              <Button variant="secondary">Xem chi tiết</Button>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
