import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { formatDateTime } from "@/lib/utils/format";

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const [{ count: classCount }, { count: examCount }, { data: exams }, { data: classIds }] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    supabase.from("exams").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    supabase.from("exams").select("*").eq("teacher_id", teacher.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("classes").select("id").eq("teacher_id", teacher.id)
  ]);
  const ids = classIds?.map((item) => item.id) ?? [];
  const { count: studentCount } = ids.length
    ? await supabase.from("class_students").select("student_id", { count: "exact", head: true }).in("class_id", ids)
    : { count: 0 };
  const { count: openCount } = await supabase.from("exams").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id).eq("status", "open");

  return (
    <>
      <PageHeader title="Tổng quan" description={`Xin chào, ${teacher.full_name}`} action={<Link href="/teacher/exams/create"><Button>Tạo đề mới</Button></Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Lớp học", classCount], ["Học sinh", studentCount], ["Đề thi", examCount], ["Đề đang mở", openCount]].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="surface overflow-hidden">
        <div className="border-b p-4 font-semibold">Bài thi gần đây</div>
        <div className="divide-y">
          {exams?.map((exam) => (
            <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`} className="flex items-center justify-between p-4 hover:bg-slate-50">
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-sm text-slate-500">{formatDateTime(exam.created_at)}</p>
              </div>
              <ExamStatusBadge status={exam.status} />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
