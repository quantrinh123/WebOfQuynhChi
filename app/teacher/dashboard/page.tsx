import Link from "next/link";
import { AlertTriangle, ChevronRight, ClipboardList, Plus, TrendingDown, Unlock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireTeacher } from "@/lib/auth";
import { getExamSetupSteps } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime, formatScore } from "@/lib/utils/format";

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const [{ data: classes }, { data: exams }] = await Promise.all([
    supabase.from("classes").select("id, name, class_students(student_id)").eq("teacher_id", teacher.id),
    supabase
      .from("exams")
      .select(
        "id, title, status, total_score, created_at, exam_assignments(class_id, end_time), submissions(student_id, status, final_score, submitted_at), exam_questions(question_type, correct_answer, correct_answers_json)"
      )
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
  ]);

  const studentsByClass = new Map((classes ?? []).map((item: any) => [item.id, (item.class_students ?? []).map((row: any) => row.student_id as string)]));
  const allStudents = new Set(Array.from(studentsByClass.values()).flat());
  const examList: any[] = exams ?? [];

  // Đề đang mở: bao nhiêu học sinh chưa nộp, hạn chót gần nhất.
  const openExams = examList
    .filter((exam) => exam.status === "open")
    .map((exam) => {
      const assigned = new Set<string>((exam.exam_assignments ?? []).flatMap((row: any) => studentsByClass.get(row.class_id) ?? []));
      const doneIds = new Set((exam.submissions ?? []).filter((row: any) => row.status !== "doing").map((row: any) => row.student_id));
      const endTimes = (exam.exam_assignments ?? []).map((row: any) => row.end_time).filter(Boolean) as string[];
      const deadline = endTimes.length ? endTimes.sort()[0] : null;
      return { exam, total: assigned.size, done: [...assigned].filter((id) => doneIds.has(id)).length, deadline };
    });

  // Đề còn dang dở.
  const unfinished = examList
    .filter((exam) => exam.status === "draft")
    .map((exam) => {
      const steps = getExamSetupSteps({ questions: exam.exam_questions ?? [], assignmentCount: (exam.exam_assignments ?? []).length, status: exam.status });
      const next = !steps.answerKeyDone ? `Còn ${steps.missingAnswers} câu/ý chưa có đáp án` : !steps.assigned ? "Chưa giao lớp" : "Chưa mở cho học sinh";
      return { exam, next };
    });

  // Học sinh cần chú ý: điểm đề gần nhất dưới 50% hoặc giảm 2 đề liên tiếp.
  const history = new Map<string, Array<{ ratio: number; at: string; title: string }>>();
  examList.forEach((exam) => {
    (exam.submissions ?? []).forEach((row: any) => {
      if (row.status === "doing" || !allStudents.has(row.student_id)) return;
      const list = history.get(row.student_id) ?? [];
      list.push({ ratio: Number(row.final_score ?? 0) / Number(exam.total_score || 10), at: row.submitted_at ?? exam.created_at, title: exam.title });
      history.set(row.student_id, list);
    });
  });
  const flagged = Array.from(history.entries())
    .map(([studentId, list]) => {
      const sorted = list.sort((a, b) => a.at.localeCompare(b.at));
      const last = sorted[sorted.length - 1];
      const reasons: string[] = [];
      if (last.ratio < 0.5) reasons.push(`${formatScore(last.ratio * 10)}/10 ở đề "${last.title}"`);
      if (sorted.length >= 3 && sorted[sorted.length - 1].ratio < sorted[sorted.length - 2].ratio && sorted[sorted.length - 2].ratio < sorted[sorted.length - 3].ratio) {
        reasons.push("Điểm giảm 2 đề liên tiếp");
      }
      return { studentId, reasons, lastRatio: last.ratio };
    })
    .filter((row) => row.reasons.length)
    .sort((a, b) => a.lastRatio - b.lastRatio)
    .slice(0, 8);
  const { data: flaggedProfiles } = flagged.length
    ? await supabase.from("profiles").select("id, full_name").in("id", flagged.map((row) => row.studentId))
    : { data: [] as Array<{ id: string; full_name: string }> };
  const nameById = new Map((flaggedProfiles ?? []).map((row) => [row.id, row.full_name]));

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`Xin chào, ${teacher.full_name}. ${classes?.length ?? 0} lớp · ${allStudents.size} học sinh · ${examList.length} đề.`}
        action={
          <Link href="/teacher/exams/create">
            <Button className="gap-2">
              <Plus size={18} />
              Tạo đề mới
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel icon={<Unlock size={20} />} tone="bg-emerald-50 text-emerald-700" title="Đề đang mở" empty="Không có đề nào đang mở.">
          {openExams.map(({ exam, total, done, deadline }) => {
            const percent = total ? Math.round((done / total) * 100) : 0;
            return (
              <Row key={exam.id} href={`/teacher/exams/${exam.id}/results`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-950">{exam.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {total - done > 0 ? <strong className="text-amber-700">{total - done} học sinh chưa nộp</strong> : "Tất cả đã nộp"}
                    {deadline ? ` · Hạn ${formatDateTime(deadline)}` : ""}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-700">{done}/{total}</span>
              </Row>
            );
          })}
        </Panel>

        <Panel icon={<ClipboardList size={20} />} tone="bg-amber-50 text-amber-700" title="Đề chưa hoàn tất" empty="Không có đề nháp nào.">
          {unfinished.map(({ exam, next }) => (
            <Row key={exam.id} href={`/teacher/exams/${exam.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-950">{exam.title}</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                  <AlertTriangle size={14} />
                  {next}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-teal-700">Tiếp tục</span>
            </Row>
          ))}
        </Panel>

        <Panel icon={<TrendingDown size={20} />} tone="bg-rose-50 text-rose-700" title="Học sinh cần chú ý" empty="Chưa có học sinh nào cần chú ý." className="xl:col-span-2">
          {flagged.map((row) => (
            <Row key={row.studentId} href={`/teacher/students/${row.studentId}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-950">{nameById.get(row.studentId) ?? "Học sinh"}</p>
                <p className="mt-0.5 text-sm text-rose-700">{row.reasons.join(" · ")}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-teal-700">Xem hồ sơ</span>
            </Row>
          ))}
        </Panel>
      </div>
    </>
  );
}

function Panel({
  icon,
  tone,
  title,
  empty,
  className,
  children
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  empty: string;
  className?: string;
  children: React.ReactNode[];
}) {
  return (
    <section className={`surface overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-slate-200/80 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {children.length ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{children.length}</span> : null}
      </div>
      <div className="divide-y divide-slate-100">{children.length ? children : <p className="p-5 text-sm text-slate-500">{empty}</p>}</div>
    </section>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 transition hover:bg-slate-50">
      {children}
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  );
}
