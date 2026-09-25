import Link from "next/link";
import { redirect } from "next/navigation";
import { startSubmission } from "@/lib/actions/student";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireStudent } from "@/lib/auth";
import { describeExamAccess, getStudentExamAccess } from "@/lib/exam-access";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

export default async function StartExamPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const access = await getStudentExamAccess(supabase, id, student.id);
  if (!access.ok && access.reason === "not_assigned") redirect("/student/exams");

  const { data: exam } = await supabase.from("exams").select("title, duration_minutes").eq("id", id).single();
  const { data: submission } = await supabase.from("submissions").select("status").eq("exam_id", id).eq("student_id", student.id).maybeSingle();
  if (submission?.status === "doing" && access.ok) redirect(`/student/exams/${id}/take`);
  if (submission && submission.status !== "doing") redirect(`/student/exams/${id}/result`);

  const action = startSubmission.bind(null, id);
  return (
    <>
      <PageHeader title="Xác nhận làm bài" description={exam?.title} />
      <div className="surface max-w-xl p-5">
        <p className="text-sm text-slate-600">Thời gian: {exam?.duration_minutes} phút</p>
        <p className={access.ok ? "mt-1 text-sm font-semibold text-emerald-700" : "mt-1 text-sm font-semibold text-rose-700"}>
          {describeExamAccess(access, formatDateTime)}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          <li>Phần I: 12 câu trắc nghiệm</li>
          <li>Phần II: 4 câu đúng/sai, mỗi câu có 4 ý</li>
          <li>Phần III: 6 câu trả lời ngắn</li>
        </ul>
        {access.ok && access.endsAt ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Bài sẽ tự nộp khi hết {exam?.duration_minutes} phút hoặc đến {formatDateTime(access.endsAt)}, tuỳ mốc nào đến trước.
          </p>
        ) : null}
        {access.ok ? (
          <form action={action} className="mt-5">
            <Button>Bắt đầu làm bài</Button>
          </form>
        ) : (
          <Link href="/student/exams" className="mt-5 inline-block">
            <Button variant="secondary">Quay lại danh sách</Button>
          </Link>
        )}
      </div>
    </>
  );
}
