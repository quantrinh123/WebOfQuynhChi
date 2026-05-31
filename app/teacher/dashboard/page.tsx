import Link from "next/link";
import { BookOpen, GraduationCap, Plus, Users, Unlock } from "lucide-react";
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

  const stats = [
    { label: "Lớp học", value: classCount ?? 0, icon: GraduationCap, tone: "bg-teal-50 text-teal-700" },
    { label: "Học sinh", value: studentCount ?? 0, icon: Users, tone: "bg-sky-50 text-sky-700" },
    { label: "Đề thi", value: examCount ?? 0, icon: BookOpen, tone: "bg-violet-50 text-violet-700" },
    { label: "Đề đang mở", value: openCount ?? 0, icon: Unlock, tone: "bg-emerald-50 text-emerald-700" }
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`Xin chào, ${teacher.full_name}. Theo dõi nhanh lớp học, đề thi và tình hình làm bài.`}
        action={
          <Link href="/teacher/exams/create">
            <Button className="gap-2">
              <Plus size={18} />
              Tạo đề mới
            </Button>
          </Link>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface group p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <p className="mt-3 text-4xl font-black text-slate-950">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tone}`}>
                <stat.icon size={23} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 p-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Bài thi gần đây</h2>
            <p className="mt-1 text-sm text-slate-500">Mở nhanh trang kết quả của từng đề.</p>
          </div>
          <Link href="/teacher/exams" className="text-sm font-bold text-teal-700 hover:text-teal-900">
            Xem tất cả
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {exams?.map((exam) => (
            <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`} className="flex items-center justify-between gap-3 p-5 transition hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{exam.title}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(exam.created_at)}</p>
              </div>
              <ExamStatusBadge status={exam.status} />
            </Link>
          ))}
          {!exams?.length ? <div className="p-6 text-sm text-slate-600">Chưa có đề thi nào.</div> : null}
        </div>
      </section>
    </>
  );
}
