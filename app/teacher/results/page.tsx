import Link from "next/link";
import { BarChart3, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatScore } from "@/lib/utils/format";

export default async function TeacherResultsPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, status, duration_minutes, submissions(id, status, final_score)")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  const rows = (exams ?? []).map((exam: any) => {
    const submissions = exam.submissions ?? [];
    const submitted = submissions.filter((submission: any) => submission.status !== "doing");
    const scores = submitted.map((submission: any) => Number(submission.final_score ?? 0));
    const average = scores.length ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length : 0;
    return { ...exam, submittedCount: submitted.length, totalCount: submissions.length, average };
  });

  return (
    <>
      <PageHeader title="Kết quả" description="Tổng hợp kết quả theo từng đề thi." />

      {!rows.length ? <EmptyState title="Chưa có đề thi" description="Tạo đề và giao cho lớp để xem kết quả tại đây." /> : null}

      <div className="grid gap-4">
        {rows.map((exam: any) => (
          <article key={exam.id} className="surface flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-lg font-bold text-slate-950">{exam.title}</h2>
                  <ExamStatusBadge status={exam.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                  <span>Đã nộp: <strong className="text-slate-900">{exam.submittedCount}/{exam.totalCount}</strong></span>
                  <span>Điểm TB: <strong className="text-slate-900">{formatScore(exam.average)}</strong></span>
                  <span>{exam.duration_minutes} phút</span>
                </div>
              </div>
            </div>
            <Link href={`/teacher/exams/${exam.id}/results`}>
              <Button className="gap-2">
                <BarChart3 size={16} />
                Xem kết quả
              </Button>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
