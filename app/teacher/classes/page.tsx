import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap, Plus, Users } from "lucide-react";
import { createClass } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Input } from "@/components/ui/input";

export default async function ClassesPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, class_students(count), exam_assignments(exams(status))")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Lớp học" description="Bấm vào một lớp để quản lý học sinh, đề đã giao và link record buổi học." />

      <ActionForm action={createClass} className="surface mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]">
        <Input name="name" placeholder="Tên lớp, ví dụ 12A1" required />
        <Input name="description" placeholder="Mô tả ngắn (không bắt buộc)" />
        <SubmitButton pendingText="Đang tạo...">
          <Plus size={17} />
          Tạo lớp
        </SubmitButton>
      </ActionForm>

      {!classes?.length ? <EmptyState title="Chưa có lớp học" description="Tạo lớp đầu tiên để thêm học sinh và giao đề." /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes?.map((item: any) => {
          const assignments = item.exam_assignments ?? [];
          const openCount = assignments.filter((assignment: any) => assignment.exams?.status === "open").length;
          return (
            <Link
              key={item.id}
              href={`/teacher/classes/${item.id}`}
              className="surface group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <GraduationCap size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-black text-slate-950">{item.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.description || "Không có mô tả"}</p>
                </div>
                <ChevronRight size={20} className="mt-1 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-slate-700">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                  <Users size={16} className="text-slate-500" />
                  {item.class_students?.[0]?.count ?? 0} học sinh
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                  <BookOpen size={16} className="text-slate-500" />
                  {assignments.length} đề
                </span>
                {openCount ? <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">{openCount} đang mở</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
