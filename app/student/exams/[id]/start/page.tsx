import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, ArrowLeft, CalendarClock, CheckSquare, Lock, PenLine, PlayCircle, Save, ToggleLeft, Wifi } from "lucide-react";
import { startSubmission } from "@/lib/actions/student";
import { MathDecor } from "@/components/student/MathDecor";
import { SubmitButton } from "@/components/ui/ActionForm";
import { requireStudent } from "@/lib/auth";
import { describeExamAccess, getStudentExamAccess } from "@/lib/exam-access";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime } from "@/lib/utils/format";

const PARTS = [
  { icon: CheckSquare, title: "Phần I", subtitle: "Trắc nghiệm", detail: "12 câu · chọn A, B, C, D", tone: "from-teal-500 to-cyan-500" },
  { icon: ToggleLeft, title: "Phần II", subtitle: "Đúng / Sai", detail: "4 câu · mỗi câu 4 ý", tone: "from-indigo-500 to-violet-500" },
  { icon: PenLine, title: "Phần III", subtitle: "Trả lời ngắn", detail: "6 câu · điền đáp số", tone: "from-amber-400 to-orange-500" }
];

const TIPS = [
  { icon: Save, text: "Đáp án được lưu tự động mỗi khi bạn chọn." },
  { icon: AlarmClock, text: "Hết giờ bài sẽ tự nộp với các đáp án đã lưu." },
  { icon: Wifi, text: "Mất mạng giữa chừng? Tải lại trang, đáp án vẫn còn." }
];

export default async function StartExamPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const access = await getStudentExamAccess(supabase, id, student.id);
  if (!access.ok && access.reason === "not_assigned") redirect("/student/exams");

  const { data: exam } = await supabase.from("exams").select("title, duration_minutes, total_score").eq("id", id).single();
  const { data: submission } = await supabase.from("submissions").select("status").eq("exam_id", id).eq("student_id", student.id).maybeSingle();
  if (submission?.status === "doing" && access.ok) redirect(`/student/exams/${id}/take`);
  if (submission && submission.status !== "doing") redirect(`/student/exams/${id}/result`);

  const action = startSubmission.bind(null, id);
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link href="/student/exams" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} />
        Danh sách bài thi
      </Link>

      <section className="surface animate-rise-in overflow-hidden">
        <div className="bg-brand relative overflow-hidden px-6 py-8 text-white sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.3),transparent_45%)]" />
          <MathDecor preset="banner" />
          <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-white/75">Sẵn sàng làm bài</p>
          <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">{exam?.title}</h1>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold ring-1 ring-white/25 backdrop-blur">
              <AlarmClock size={15} />
              {exam?.duration_minutes} phút
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold ring-1 ring-white/25 backdrop-blur">
              <CalendarClock size={15} />
              {describeExamAccess(access, formatDateTime)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {PARTS.map((part, index) => (
              <div key={part.title} className="animate-rise-in rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4" style={{ animationDelay: `${120 + index * 80}ms` }}>
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", part.tone)}>
                  <part.icon size={19} />
                </span>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">{part.title}</p>
                <p className="font-black text-slate-950">{part.subtitle}</p>
                <p className="mt-0.5 text-xs text-slate-500">{part.detail}</p>
              </div>
            ))}
          </div>

          <ul className="grid gap-2.5">
            {TIPS.map((tip) => (
              <li key={tip.text} className="flex items-center gap-3 text-sm text-slate-600">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <tip.icon size={16} />
                </span>
                {tip.text}
              </li>
            ))}
          </ul>

          {access.ok && access.endsAt ? (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-900 ring-1 ring-amber-100">
              Bài sẽ tự nộp khi hết {exam?.duration_minutes} phút hoặc đến <strong>{formatDateTime(access.endsAt)}</strong>, tuỳ mốc nào đến trước.
            </p>
          ) : null}

          {access.ok ? (
            <form action={action}>
              <SubmitButton className="h-14 w-full rounded-2xl text-base" pendingText="Đang mở đề...">
                <PlayCircle size={20} />
                Bắt đầu làm bài
              </SubmitButton>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-600">
                <Lock size={22} />
              </span>
              <p className="font-bold text-slate-900">{describeExamAccess(access, formatDateTime)}</p>
              <Link href="/student/exams" className="text-sm font-bold text-teal-700 hover:text-teal-900">
                Quay lại danh sách bài thi
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
