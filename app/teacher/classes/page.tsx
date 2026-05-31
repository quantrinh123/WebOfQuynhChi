import Link from "next/link";
import { BookOpen, GraduationCap, Plus, Trash2, Users } from "lucide-react";
import { createClass, deleteClass } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Input } from "@/components/ui/input";

export default async function ClassesPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*, class_students(count)")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Lớp học" description="Tạo lớp, thêm học sinh và quản lý các đề đã giao cho từng lớp." />

      <form action={createClass} className="surface mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]">
        <Input name="name" placeholder="Tên lớp, ví dụ 12A1" required />
        <Input name="description" placeholder="Mô tả ngắn" />
        <Button className="gap-2">
          <Plus size={17} />
          Tạo lớp
        </Button>
      </form>

      {!classes?.length ? <EmptyState title="Chưa có lớp học" description="Tạo lớp đầu tiên để thêm học sinh và giao đề." /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {classes?.map((item) => (
          <article key={item.id} className="surface p-5 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <GraduationCap size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-slate-950">{item.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.description || "Không có mô tả"}</p>
              </div>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">
              <Users size={16} className="text-slate-500" />
              {item.class_students?.[0]?.count ?? 0} học sinh
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/teacher/classes/${item.id}`}>
                <Button variant="secondary" className="gap-2">
                  <Users size={16} />
                  Chi tiết
                </Button>
              </Link>
              <Link href="/teacher/exams">
                <Button className="gap-2">
                  <BookOpen size={16} />
                  Giao bài
                </Button>
              </Link>
              <form action={deleteClass.bind(null, item.id)}>
                <ConfirmSubmitButton variant="danger" className="gap-2" message={`Xoá lớp ${item.name}? Toàn bộ liên kết học sinh và giao đề của lớp này sẽ bị xoá.`}>
                  <Trash2 size={16} />
                  Xoá
                </ConfirmSubmitButton>
              </form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
