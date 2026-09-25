import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock3 } from "lucide-react";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { TabNav } from "@/components/ui/TabNav";
import { requireTeacher } from "@/lib/auth";
import { getExamSetupSteps } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/format";

export default async function ExamHubLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("id, title, status, duration_minutes, grade").eq("id", id).eq("teacher_id", teacher.id).maybeSingle();
  if (!exam) notFound();

  const [{ data: questions }, { count: assignmentCount }, { count: submittedCount }] = await Promise.all([
    supabase.from("exam_questions").select("question_type, correct_answer, correct_answers_json").eq("exam_id", id),
    supabase.from("exam_assignments").select("id", { count: "exact", head: true }).eq("exam_id", id),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("exam_id", id).neq("status", "doing")
  ]);
  const steps = getExamSetupSteps({ questions: questions ?? [], assignmentCount: assignmentCount ?? 0, status: exam.status });
  const setupDone = steps.answerKeyDone && steps.assigned && steps.opened;
  const base = `/teacher/exams/${id}`;

  return (
    <>
      <Link href="/teacher/exams" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} />
        Tất cả đề thi
      </Link>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{exam.title}</h1>
            <ExamStatusBadge status={exam.status} />
          </div>
          <p className="mt-1 flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{exam.duration_minutes} phút</span>
            <span>Khối {exam.grade}</span>
          </p>
        </div>
      </header>

      {!setupDone ? (
        <ol className="surface mb-5 grid gap-2 p-3 sm:grid-cols-3">
          <SetupStep
            index={1}
            done={steps.answerKeyDone}
            href={`${base}/answer-key`}
            title="Nhập đáp án"
            hint={steps.answerKeyDone ? "Đã đủ đáp án" : `Còn ${steps.missingAnswers} câu/ý chưa có đáp án`}
          />
          <SetupStep index={2} done={steps.assigned} href={`${base}/assign`} title="Giao lớp" hint={steps.assigned ? `Đã giao ${assignmentCount} lớp` : "Chưa giao lớp nào"} />
          <SetupStep index={3} done={steps.opened} href={`${base}/assign`} title="Mở đề" hint={steps.opened ? "Đã mở" : "Học sinh chưa thấy đề"} />
        </ol>
      ) : null}

      <TabNav
        items={[
          { href: `${base}/results`, label: "Kết quả", badge: submittedCount ?? 0 },
          { href: `${base}/analysis`, label: "Phân tích câu" },
          { href: `${base}/answer-key`, label: "Đáp án", badge: steps.missingAnswers ? `thiếu ${steps.missingAnswers}` : null },
          { href: `${base}/assign`, label: "Giao lớp", badge: assignmentCount ?? 0 },
          { href: `${base}/settings`, label: "Cài đặt" }
        ]}
      />
      {children}
    </>
  );
}

function SetupStep({ index, done, href, title, hint }: { index: number; done: boolean; href: string; title: string; hint: string }) {
  return (
    <li>
      <Link href={href} className={cn("flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50")}>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black",
            done ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"
          )}
        >
          {done ? <Check size={16} /> : index}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className={cn("block truncate text-xs", done ? "text-emerald-700" : "text-amber-700")}>{hint}</span>
        </span>
      </Link>
    </li>
  );
}
