import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { deleteExam, setExamStatus } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { getExamSetupSteps } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatScore } from "@/lib/utils/format";

type TeacherExamSearchParams = {
  q?: string | string[];
  status?: string | string[];
  page?: string | string[];
};

const PAGE_SIZE = 8;
const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "draft", label: "Bản nháp" },
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã đóng" }
];

export default async function TeacherExamsPage({ searchParams }: { searchParams?: Promise<TeacherExamSearchParams> }) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const resolvedSearchParams = (await searchParams) ?? {};
  const titleQuery = firstValue(resolvedSearchParams.q)?.trim() ?? "";
  const statusQuery = STATUS_FILTERS.some((item) => item.value === firstValue(resolvedSearchParams.status)) ? firstValue(resolvedSearchParams.status) ?? "" : "";
  const requestedPage = Math.max(1, Number.parseInt(firstValue(resolvedSearchParams.page) ?? "1", 10) || 1);

  const { count } = await applyExamFilters(
    supabase.from("exams").select("id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    titleQuery,
    statusQuery
  );
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;

  const { data: exams } = await applyExamFilters(
    supabase
      .from("exams")
      .select(
        "id, title, status, duration_minutes, grade, created_at, submissions(student_id, status, final_score), exam_assignments(class_id, end_time, classes(name)), exam_questions(question_type, correct_answer, correct_answers_json)"
      )
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    titleQuery,
    statusQuery
  );

  const examList: any[] = exams ?? [];
  const classIds = Array.from(new Set(examList.flatMap((exam: any) => (exam.exam_assignments ?? []).map((item: any) => item.class_id))));
  const { data: roster } = classIds.length
    ? await supabase.from("class_students").select("class_id, student_id").in("class_id", classIds)
    : { data: [] as Array<{ class_id: string; student_id: string }> };

  const rows = examList.map((exam) => {
    const assignedClassIds = new Set((exam.exam_assignments ?? []).map((item: any) => item.class_id));
    const studentCount = new Set((roster ?? []).filter((row) => assignedClassIds.has(row.class_id)).map((row) => row.student_id)).size;
    const done = (exam.submissions ?? []).filter((item: any) => item.status !== "doing");
    const average = done.length ? done.reduce((sum: number, item: any) => sum + Number(item.final_score ?? 0), 0) / done.length : null;
    const steps = getExamSetupSteps({ questions: exam.exam_questions ?? [], assignmentCount: assignedClassIds.size, status: exam.status });
    const nextStep = !steps.answerKeyDone
      ? `Còn ${steps.missingAnswers} câu/ý chưa có đáp án`
      : !steps.assigned
        ? "Chưa giao cho lớp nào"
        : !steps.opened
          ? "Chưa mở cho học sinh"
          : null;
    return {
      exam,
      classNames: (exam.exam_assignments ?? []).map((item: any) => item.classes?.name).filter(Boolean) as string[],
      doneCount: done.length,
      studentCount,
      average,
      nextStep
    };
  });

  const hasFilters = Boolean(titleQuery || statusQuery);
  const startItem = totalCount ? from + 1 : 0;
  const endItem = totalCount ? Math.min(from + PAGE_SIZE, totalCount) : 0;

  return (
    <>
      <PageHeader
        title="Đề thi"
        description="Bấm vào một đề để nhập đáp án, giao lớp và xem kết quả."
        action={
          <Link href="/teacher/exams/create">
            <Button className="gap-2">
              <Plus size={18} />
              Tạo đề
            </Button>
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Link
              key={filter.value}
              href={buildExamListHref({ q: titleQuery, status: filter.value })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-bold transition",
                statusQuery === filter.value ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <form method="get" className="flex gap-2 lg:w-96">
          {statusQuery ? <input type="hidden" name="status" value={statusQuery} /> : null}
          <Input name="q" defaultValue={titleQuery} placeholder="Tìm theo tên đề" />
          <Button type="submit" variant="secondary" className="shrink-0 gap-2">
            <Search size={16} />
            Tìm
          </Button>
        </form>
      </div>

      {!rows.length ? (
        <EmptyState
          title={hasFilters ? "Không tìm thấy đề phù hợp" : "Chưa có đề thi"}
          description={hasFilters ? "Thử bỏ bớt điều kiện tìm kiếm để xem thêm đề." : "Tạo đề Toán THPT 2025 và upload file PDF."}
        />
      ) : null}

      {rows.length ? (
        <>
          <p className="mb-3 text-sm text-slate-600">
            {startItem}-{endItem} / {totalCount} đề
          </p>
          <div className="grid gap-3">
            {rows.map(({ exam, classNames, doneCount, studentCount, average, nextStep }) => (
              <article key={exam.id} className="surface relative transition hover:border-teal-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
                <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <Link href={`/teacher/exams/${exam.id}`} className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-lg font-black text-slate-950 hover:text-teal-800">{exam.title}</h2>
                      <ExamStatusBadge status={exam.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-slate-400" />{exam.duration_minutes} phút</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="text-slate-400" />{formatDateTime(exam.created_at)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={15} className="text-slate-400" />
                        {classNames.length ? classNames.join(", ") : "Chưa giao lớp"}
                      </span>
                    </div>
                    {nextStep ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                        <AlertTriangle size={15} />
                        {nextStep}
                      </p>
                    ) : null}
                  </Link>

                  <div className="flex items-center gap-4 lg:justify-end">
                    {exam.status !== "draft" ? (
                      <div className="flex gap-4 text-center text-sm">
                        <div>
                          <p className="text-xl font-black text-slate-950">{doneCount}/{studentCount}</p>
                          <p className="text-xs text-slate-500">đã nộp</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-950">{average === null ? "-" : formatScore(average)}</p>
                          <p className="text-xs text-slate-500">điểm TB</p>
                        </div>
                      </div>
                    ) : null}
                    <Link href={`/teacher/exams/${exam.id}`}>
                      <Button className="h-10 px-4">{nextStep ? "Tiếp tục" : "Mở đề"}</Button>
                    </Link>
                    <ExamMenu examId={exam.id} title={exam.title} status={exam.status} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Trang {currentPage}/{totalPages}</p>
              <div className="flex flex-wrap gap-2">
                <PageLink disabled={currentPage <= 1} href={buildExamListHref({ q: titleQuery, status: statusQuery, page: currentPage - 1 })}>
                  <ChevronLeft size={16} />
                  Trước
                </PageLink>
                <PageLink disabled={currentPage >= totalPages} href={buildExamListHref({ q: titleQuery, status: statusQuery, page: currentPage + 1 })}>
                  Sau
                  <ChevronRight size={16} />
                </PageLink>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function ExamMenu({ examId, title, status }: { examId: string; title: string; status: string }) {
  const itemClass = "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100";
  return (
    <details className="relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden" title="Thao tác khác">
        <MoreHorizontal size={18} />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
        <Link href={`/teacher/exams/${examId}/results`} className={itemClass}>Kết quả</Link>
        <Link href={`/teacher/exams/${examId}/answer-key`} className={itemClass}>Đáp án</Link>
        <Link href={`/teacher/exams/${examId}/assign`} className={itemClass}>Giao lớp</Link>
        <Link href={`/teacher/exams/${examId}/settings`} className={itemClass}>Cài đặt</Link>
        {status === "open" ? (
          <ActionForm action={setExamStatus.bind(null, examId, "closed")}>
            <SubmitButton variant="secondary" className="w-full justify-start border-0 shadow-none" confirmMessage={`Đóng đề ${title}?`}>
              Đóng đề
            </SubmitButton>
          </ActionForm>
        ) : null}
        <form action={deleteExam.bind(null, examId)} className="mt-1 border-t border-slate-100 pt-1">
          <ConfirmSubmitButton variant="secondary" className="w-full justify-start border-0 text-rose-700 shadow-none" message={`Xoá đề ${title}? Toàn bộ bài nộp và file PDF sẽ bị xoá.`}>
            Xoá đề
          </ConfirmSubmitButton>
        </form>
      </div>
    </details>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <Button variant="secondary" className="gap-2" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Link href={href}>
      <Button variant="secondary" className="gap-2">
        {children}
      </Button>
    </Link>
  );
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function applyExamFilters(query: any, titleQuery: string, statusQuery: string) {
  let nextQuery = query;
  if (titleQuery) nextQuery = nextQuery.ilike("title", `%${titleQuery}%`);
  if (statusQuery) nextQuery = nextQuery.eq("status", statusQuery);
  return nextQuery;
}

function buildExamListHref(filters: { q?: string; status?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/teacher/exams?${query}` : "/teacher/exams";
}
