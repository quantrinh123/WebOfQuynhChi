import Link from "next/link";
import { BarChart3, CalendarDays, Clock3, FilePenLine, Lock, Plus, Send, Trash2 } from "lucide-react";
import { closeExam, deleteExam } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

export default async function TeacherExamsPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Đề thi"
        description="Quản lý đề, nhập đáp án, giao lớp và theo dõi kết quả làm bài."
        action={
          <Link href="/teacher/exams/create">
            <Button className="gap-2">
              <Plus size={18} />
              Tạo đề
            </Button>
          </Link>
        }
      />

      {!exams?.length ? <EmptyState title="Chưa có đề thi" description="Tạo đề Toán THPT 2025 và upload file PDF." /> : null}

      <div className="grid gap-4">
        {exams?.map((exam) => (
          <article key={exam.id} className="surface overflow-hidden transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-xl font-black text-slate-950">{exam.title}</h2>
                  <ExamStatusBadge status={exam.status} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={16} className="text-slate-400" />
                    {exam.duration_minutes} phút
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-slate-400" />
                    {formatDateTime(exam.created_at)}
                  </span>
                  <span>Khối {exam.grade}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href={`/teacher/exams/${exam.id}/answer-key`}>
                  <Button variant="secondary" className="h-10 gap-2 px-3">
                    <FilePenLine size={16} />
                    Đáp án
                  </Button>
                </Link>
                <Link href={`/teacher/exams/${exam.id}/assign`}>
                  <Button variant="secondary" className="h-10 gap-2 px-3">
                    <Send size={16} />
                    Giao đề
                  </Button>
                </Link>
                <Link href={`/teacher/exams/${exam.id}/results`}>
                  <Button className="h-10 gap-2 px-3">
                    <BarChart3 size={16} />
                    Kết quả
                  </Button>
                </Link>
                {exam.status !== "closed" ? (
                  <form action={closeExam.bind(null, exam.id)}>
                    <ConfirmSubmitButton variant="secondary" className="h-10 gap-2 px-3" message={`Đóng đề ${exam.title}? Học sinh sẽ không thể tiếp tục làm đề này.`}>
                      <Lock size={16} />
                      Đóng
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
                <form action={deleteExam.bind(null, exam.id)}>
                  <ConfirmSubmitButton variant="danger" className="h-10 gap-2 px-3" message={`Xoá đề ${exam.title}? Toàn bộ câu hỏi, giao đề, bài nộp và file PDF liên quan sẽ bị xoá.`}>
                    <Trash2 size={16} />
                    Xoá
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
