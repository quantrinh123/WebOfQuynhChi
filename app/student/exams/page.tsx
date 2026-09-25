import Link from "next/link";
import { CalendarClock, Clock3, FileText, PlayCircle, RotateCcw, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireStudent } from "@/lib/auth";
import { describeExamAccess, evaluateExamAccess } from "@/lib/exam-access";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

export default async function StudentExamsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: memberships } = await supabase.from("class_students").select("class_id").eq("student_id", student.id);
  const classIds = memberships?.map((item) => item.class_id) ?? [];
  const { data: assignments } = classIds.length
    ? await supabase
        .from("exam_assignments")
        .select("exam_id, start_time, end_time, created_at, exams(id, title, status, duration_minutes)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: submissions } = await supabase.from("submissions").select("exam_id, status").eq("student_id", student.id);

  // Gom các lần giao cùng một đề (học sinh ở nhiều lớp) và bỏ đề còn là bản nháp.
  const exams = new Map<string, { exam: any; windows: Array<{ start_time: string | null; end_time: string | null }> }>();
  (assignments ?? []).forEach((assignment: any) => {
    if (!assignment.exams || assignment.exams.status === "draft") return;
    const entry = exams.get(assignment.exam_id) ?? { exam: assignment.exams, windows: [] };
    entry.windows.push({ start_time: assignment.start_time, end_time: assignment.end_time });
    exams.set(assignment.exam_id, entry);
  });

  return (
    <>
      <PageHeader title="Bài thi được giao" description="Chọn đề để bắt đầu làm bài, tiếp tục bài đang làm hoặc xem kết quả." />
      {!exams.size ? <EmptyState title="Chưa có bài thi" description="Giáo viên chưa giao đề cho lớp của bạn." /> : null}

      <div className="grid gap-4">
        {Array.from(exams.entries()).map(([examId, { exam, windows }]) => {
          const access = evaluateExamAccess(exam.status, windows);
          const submission = submissions?.find((item) => item.exam_id === examId);
          const done = submission && submission.status !== "doing";
          const doing = submission?.status === "doing";
          const status = done ? "Đã nộp" : doing ? "Đang làm" : "Chưa làm";

          return (
            <article key={examId} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-950">{exam.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{exam.duration_minutes} phút</span>
                    <span>{status}</span>
                    <span className={access.ok ? "inline-flex items-center gap-1.5 text-emerald-700" : "inline-flex items-center gap-1.5 text-rose-700"}>
                      <CalendarClock size={15} />
                      {describeExamAccess(access, formatDateTime)}
                    </span>
                  </div>
                </div>
              </div>
              {done ? (
                <Link href={`/student/exams/${examId}/result`}>
                  <Button className="gap-2"><Trophy size={16} />Xem kết quả</Button>
                </Link>
              ) : doing && !access.ok ? (
                // Hết hạn khi đang làm: trang làm bài sẽ tự nộp các đáp án đã lưu rồi chuyển sang kết quả.
                <Link href={`/student/exams/${examId}/take`}>
                  <Button className="gap-2"><Trophy size={16} />Xem kết quả</Button>
                </Link>
              ) : access.ok ? (
                <Link href={doing ? `/student/exams/${examId}/take` : `/student/exams/${examId}/start`}>
                  <Button className="gap-2">
                    {doing ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
                    {doing ? "Tiếp tục" : "Bắt đầu"}
                  </Button>
                </Link>
              ) : (
                <Button className="gap-2" disabled>
                  <PlayCircle size={16} />
                  {access.reason === "not_started" ? "Chưa tới giờ" : "Đã đóng"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
