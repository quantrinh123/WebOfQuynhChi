import Link from "next/link";
import { BookOpen, GraduationCap, Trash2, Users } from "lucide-react";
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
      <PageHeader title="Lớp học" description="Quản lý lớp, học sinh và các đề đã giao." />

      <form action={createClass} className="surface mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]">
        <Input name="name" placeholder="Tên lớp, ví dụ 12A1" required />
        <Input name="description" placeholder="Mô tả ngắn" />
        <Button>Tạo lớp</Button>
      </form>

      {!classes?.length ? <EmptyState title="Chưa có lớp học" description="Tạo lớp đầu tiên để thêm học sinh và giao đề." /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {classes?.map((item) => (
          <article key={item.id} className="surface p-5 transition hover:border-teal-200 hover:shadow-lg">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <GraduationCap size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-950">{item.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.description || "Không có mô tả"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
              <Users size={16} className="text-slate-400" />
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
                <ConfirmSubmitButton
                  variant="danger"
                  className="gap-2"
                  message={`Xoá lớp ${item.name}? Toàn bộ liên kết học sinh và giao đề của lớp này sẽ bị xoá.`}
                >
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
