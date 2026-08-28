import Link from "next/link";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock3, FilePenLine, Lock, Plus, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { closeExam, deleteExam } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

type TeacherExamSearchParams = {
  q?: string | string[];
  grade?: string | string[];
  page?: string | string[];
};

const PAGE_SIZE = 8;

export default async function TeacherExamsPage({ searchParams }: { searchParams?: Promise<TeacherExamSearchParams> }) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const titleQuery = firstValue(resolvedSearchParams.q)?.trim() ?? "";
  const gradeQuery = firstValue(resolvedSearchParams.grade)?.trim() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(firstValue(resolvedSearchParams.page) ?? "1", 10) || 1);

  const countQuery = applyExamFilters(
    supabase.from("exams").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    titleQuery,
    gradeQuery
  );
  const { count } = await countQuery;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: exams } = await applyExamFilters(
    supabase
      .from("exams")
      .select("id, title, status, duration_minutes, grade, created_at")
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    titleQuery,
    gradeQuery
  );

  const hasFilters = Boolean(titleQuery || gradeQuery);
  const startItem = totalCount ? from + 1 : 0;
  const endItem = totalCount ? Math.min(from + PAGE_SIZE, totalCount) : 0;

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

      <form method="get" className="surface mb-5 grid gap-4 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto] md:items-end">
        <label className="text-sm font-medium">
          Tên đề
          <Input className="mt-1" name="q" defaultValue={titleQuery} placeholder="Tìm theo tên đề" />
        </label>
        <label className="text-sm font-medium">
          Khối
          <Input className="mt-1" name="grade" defaultValue={gradeQuery} placeholder="Ví dụ: 12" />
        </label>
        <Button type="submit" className="gap-2">
          <Search size={16} />
          Tìm
        </Button>
        <Link href="/teacher/exams">
          <Button variant="secondary" className="gap-2">
            <RotateCcw size={16} />
            Xoá lọc
          </Button>
        </Link>
      </form>

      {!exams?.length ? (
        <EmptyState
          title={hasFilters ? "Không tìm thấy đề phù hợp" : "Chưa có đề thi"}
          description={hasFilters ? "Thử bỏ bớt điều kiện tìm kiếm để xem thêm đề." : "Tạo đề Toán THPT 2025 và upload file PDF."}
        />
      ) : null}

      {exams?.length ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p>
              Đang hiển thị <strong className="text-slate-900">{startItem}</strong>-
              <strong className="text-slate-900">{endItem}</strong> / <strong className="text-slate-900">{totalCount}</strong> đề
            </p>
            <p>Trang {currentPage}/{totalPages}</p>
          </div>

          <div className="grid gap-4">
            {exams.map((exam: any) => (
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

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Trang {currentPage}/{totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPage > 1 ? (
                  <Link href={buildExamListHref({ q: titleQuery, grade: gradeQuery, page: currentPage - 1 })}>
                    <Button variant="secondary" className="gap-2">
                      <ChevronLeft size={16} />
                      Trước
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="gap-2" disabled>
                    <ChevronLeft size={16} />
                    Trước
                  </Button>
                )}
                {currentPage < totalPages ? (
                  <Link href={buildExamListHref({ q: titleQuery, grade: gradeQuery, page: currentPage + 1 })}>
                    <Button variant="secondary" className="gap-2">
                      Sau
                      <ChevronRight size={16} />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="gap-2" disabled>
                    Sau
                    <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function applyExamFilters(query: any, titleQuery: string, gradeQuery: string) {
  let nextQuery = query;
  if (titleQuery) nextQuery = nextQuery.ilike("title", `%${titleQuery}%`);
  if (gradeQuery) nextQuery = nextQuery.eq("grade", gradeQuery);
  return nextQuery;
}

function buildExamListHref(filters: { q?: string; grade?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.grade) params.set("grade", filters.grade);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/teacher/exams?${query}` : "/teacher/exams";
}
