import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, FileText, Hourglass, Lock, PlayCircle, RotateCcw, Target, Trophy } from "lucide-react";
import { MathDecor } from "@/components/student/MathDecor";
import { ScoreRing } from "@/components/student/ScoreRing";
import { CountUp } from "@/components/student/CountUp";
import { StudentEmpty } from "@/components/student/StudentEmpty";
import { PiMascot } from "@/components/mascot/PiMascot";
import { requireStudent } from "@/lib/auth";
import { evaluateExamAccess, type ExamAccess } from "@/lib/exam-access";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatScore } from "@/lib/utils/format";

type ExamCard = {
  examId: string;
  exam: any;
  access: ExamAccess;
  submission?: { status: string; final_score: number | null };
};

export default async function StudentExamsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: memberships } = await supabase.from("class_students").select("class_id").eq("student_id", student.id);
  const classIds = memberships?.map((item) => item.class_id) ?? [];
  const { data: assignments } = classIds.length
    ? await supabase
        .from("exam_assignments")
        .select("exam_id, start_time, end_time, created_at, exams(id, title, status, duration_minutes, total_score, show_score_after_submit)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const { data: submissions } = await supabase.from("submissions").select("exam_id, status, final_score").eq("student_id", student.id);

  // Gom các lần giao cùng một đề (học sinh ở nhiều lớp) và bỏ đề còn là bản nháp.
  const grouped = new Map<string, { exam: any; windows: Array<{ start_time: string | null; end_time: string | null }> }>();
  (assignments ?? []).forEach((assignment: any) => {
    if (!assignment.exams || assignment.exams.status === "draft") return;
    const entry = grouped.get(assignment.exam_id) ?? { exam: assignment.exams, windows: [] };
    entry.windows.push({ start_time: assignment.start_time, end_time: assignment.end_time });
    grouped.set(assignment.exam_id, entry);
  });

  const cards: ExamCard[] = Array.from(grouped.entries()).map(([examId, { exam, windows }]) => ({
    examId,
    exam,
    access: evaluateExamAccess(exam.status, windows),
    submission: submissions?.find((item) => item.exam_id === examId)
  }));

  const done = cards.filter((card) => card.submission && card.submission.status !== "doing");
  const todo = cards
    .filter((card) => !done.includes(card) && (card.access.ok || card.submission?.status === "doing"))
    .sort((a, b) => deadlineOf(a) - deadlineOf(b));
  const upcoming = cards.filter((card) => !done.includes(card) && !todo.includes(card) && !card.access.ok && card.access.reason === "not_started");
  const missed = cards.filter((card) => !done.includes(card) && !todo.includes(card) && !upcoming.includes(card));

  const scored = done.filter((card) => card.exam.show_score_after_submit);
  const average = scored.length
    ? scored.reduce((sum, card) => sum + (Number(card.submission?.final_score ?? 0) / Number(card.exam.total_score || 10)) * 10, 0) / scored.length
    : null;

  return (
    <div className="grid gap-8">
      <section className="bg-brand relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_24px_50px_-24px_rgba(6,182,212,0.8)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.3),transparent_40%),radial-gradient(circle_at_5%_120%,rgba(79,70,229,0.5),transparent_50%)]" />
        <MathDecor preset="hero" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">{student.full_name}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {todo.length ? `Bạn có ${todo.length} bài cần làm` : "Bạn đã làm hết bài được giao"}
            </h1>
          </div>
          <div className="flex items-end gap-4">
          <PiMascot className="hidden h-[92px] w-[116px] shrink-0 md:block" />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <HeroStat icon={Target} value={todo.length} label="Cần làm" />
            <HeroStat icon={CheckCircle2} value={done.length} label="Đã nộp" />
            <HeroStat icon={Trophy} value={average === null ? "-" : Math.round(average * 100) / 100} decimals={2} label="Điểm TB" />
          </div>
          </div>
        </div>
      </section>

      {!cards.length ? <StudentEmpty title="Chưa có bài thi" description="Giáo viên chưa giao đề cho lớp của bạn." /> : null}

      {todo.length ? (
        <Section title="Cần làm" count={todo.length} dot="bg-teal-500">
          {todo.map((card, index) => (
            <TodoCard key={card.examId} card={card} index={index} />
          ))}
        </Section>
      ) : null}

      {upcoming.length ? (
        <Section title="Sắp mở" count={upcoming.length} dot="bg-amber-400">
          {upcoming.map((card, index) => (
            <SimpleCard
              key={card.examId}
              card={card}
              index={index}
              icon={Hourglass}
              tone="from-amber-400 to-orange-500"
              note={!card.access.ok && card.access.startsAt ? `Mở lúc ${formatDateTime(card.access.startsAt)} · ${timeUntil(card.access.startsAt)}` : "Sắp mở"}
            />
          ))}
        </Section>
      ) : null}

      {done.length ? (
        <Section title="Đã hoàn thành" count={done.length} dot="bg-emerald-500">
          {done.map((card, index) => (
            <DoneCard key={card.examId} card={card} index={index} />
          ))}
        </Section>
      ) : null}

      {missed.length ? (
        <Section title="Đã đóng" count={missed.length} dot="bg-slate-400">
          {missed.map((card, index) => (
            <SimpleCard key={card.examId} card={card} index={index} icon={Lock} tone="from-slate-400 to-slate-500" note="Bạn chưa làm bài này và đề đã đóng" muted />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, count, dot, children }: { title: string; count: number; dot: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{count}</span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{children}</div>
    </section>
  );
}

function TodoCard({ card, index }: { card: ExamCard; index: number }) {
  const doing = card.submission?.status === "doing";
  const endsAt = card.access.ok ? card.access.endsAt : null;
  const urgent = endsAt ? new Date(endsAt).getTime() - Date.now() < 86_400_000 : false;
  // Hết hạn khi đang làm dở: trang làm bài sẽ tự nộp rồi chuyển sang kết quả.
  const href = doing ? `/student/exams/${card.examId}/take` : `/student/exams/${card.examId}/start`;

  return (
    <Link
      href={href}
      className="surface animate-rise-in group relative flex flex-col overflow-hidden p-5 transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_24px_50px_-24px_rgba(13,148,136,0.45)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", doing ? "from-sky-500 to-indigo-500" : "from-teal-500 to-cyan-500")} />
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
            doing ? "from-sky-500 to-indigo-500" : "from-teal-500 to-cyan-500"
          )}
        >
          {doing ? <RotateCcw size={22} /> : <FileText size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-black leading-snug text-slate-950">{card.exam.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip icon={Clock3}>{card.exam.duration_minutes} phút</Chip>
            {doing ? <Chip className="bg-sky-50 text-sky-700">Đang làm dở</Chip> : null}
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", urgent ? "text-rose-600" : "text-slate-500")}>
          <CalendarClock size={14} />
          {endsAt ? `Hạn ${formatDateTime(endsAt)} · ${timeUntil(endsAt)}` : "Không giới hạn hạn nộp"}
        </span>
        <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)] transition group-hover:gap-2.5">
          {doing ? "Làm tiếp" : "Bắt đầu"}
          {doing ? <ArrowRight size={16} /> : <PlayCircle size={16} />}
        </span>
      </div>
    </Link>
  );
}

function DoneCard({ card, index }: { card: ExamCard; index: number }) {
  const showScore = card.exam.show_score_after_submit;
  return (
    <Link
      href={`/student/exams/${card.examId}/result`}
      className="surface animate-rise-in group flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_50px_-24px_rgba(16,185,129,0.45)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {showScore ? (
        <ScoreRing id={card.examId} score={Number(card.submission?.final_score ?? 0)} max={Number(card.exam.total_score || 10)} size={72} stroke={3.4} showMax={false} />
      ) : (
        <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-black text-slate-950">{card.exam.title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{showScore ? "Bấm để xem chi tiết và xếp hạng" : "Giáo viên chưa công bố điểm"}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
    </Link>
  );
}

function SimpleCard({
  card,
  index,
  icon: Icon,
  tone,
  note,
  muted
}: {
  card: ExamCard;
  index: number;
  icon: React.ElementType;
  tone: string;
  note: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("surface animate-rise-in flex items-center gap-4 p-5", muted && "opacity-70")} style={{ animationDelay: `${index * 60}ms` }}>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md", tone)}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <h3 className="truncate font-black text-slate-950">{card.exam.title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {card.exam.duration_minutes} phút · {note}
        </p>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, value, label, decimals = 0 }: { icon: React.ElementType; value: number | string; label: string; decimals?: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-center ring-1 ring-white/25 backdrop-blur">
      <Icon size={18} className="mx-auto text-white/80" />
      <p className="mt-1 text-2xl font-black leading-none">
        <CountUp value={value} decimals={decimals} />
      </p>
      <p className="mt-1 text-[11px] font-semibold text-white/80">{label}</p>
    </div>
  );
}

function Chip({ icon: Icon, className, children }: { icon?: React.ElementType; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600", className)}>
      {Icon ? <Icon size={13} /> : null}
      {children}
    </span>
  );
}

function deadlineOf(card: ExamCard) {
  return card.access.ok && card.access.endsAt ? new Date(card.access.endsAt).getTime() : Number.POSITIVE_INFINITY;
}

function timeUntil(value: string) {
  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) return "đã qua";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `còn ${hours} giờ`;
  return `còn ${Math.floor(hours / 24)} ngày`;
}
