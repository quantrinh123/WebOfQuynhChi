import Link from "next/link";
import { Clock3, FileText, PlayCircle, RotateCcw, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function StudentExamsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: memberships } = await supabase.from("class_students").select("class_id").eq("student_id", student.id);
  const classIds = memberships?.map((item) => item.class_id) ?? [];
  const { data: assignments } = classIds.length
    ? await supabase.from("exam_assignments").select("*, exams(*)").in("class_id", classIds).order("created_at", { ascending: false })
    : { data: [] };
  const { data: submissions } = await supabase.from("submissions").select("*").eq("student_id", student.id);

  const uniqueAssignments = new Map<string, any>();
  assignments?.forEach((assignment: any) => {
    if (!uniqueAssignments.has(assignment.exam_id)) uniqueAssignments.set(assignment.exam_id, assignment);
  });

  return (
    <>
      <PageHeader title="Bài thi được giao" description="Chọn đề để bắt đầu làm bài, tiếp tục bài đang làm hoặc xem kết quả." />
      {!uniqueAssignments.size ? <EmptyState title="Chưa có bài thi" description="Giáo viên chưa giao đề cho lớp của bạn." /> : null}

      <div className="grid gap-4">
        {Array.from(uniqueAssignments.values()).map((assignment: any) => {
          const submission = submissions?.find((item) => item.exam_id === assignment.exam_id);
          const status = submission?.status === "graded" ? "Đã nộp" : submission ? "Đang làm" : "Chưa làm";
          const href = submission?.status === "graded" ? `/student/exams/${assignment.exam_id}/result` : `/student/exams/${assignment.exam_id}/start`;

          return (
            <article key={assignment.exam_id} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileText size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-950">{assignment.exams.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{assignment.exams.duration_minutes} phút</span>
                    <span>{status}</span>
                  </div>
                </div>
              </div>
              <Link href={href}>
                <Button className="gap-2">
                  {submission?.status === "graded" ? <Trophy size={16} /> : submission ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
                  {submission?.status === "graded" ? "Xem kết quả" : submission ? "Tiếp tục" : "Bắt đầu"}
                </Button>
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
