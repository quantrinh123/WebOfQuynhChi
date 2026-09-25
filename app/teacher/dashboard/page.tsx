import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  GraduationCap,
  Inbox,
  TrendingDown,
  Unlock,
  Users
} from "lucide-react";
import { ColumnChart, type ColumnDatum } from "@/components/charts/ColumnChart";
import { ScoreBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { getExamSetupSteps } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { APP_TIME_ZONE, cn, formatDateTime, formatScore } from "@/lib/utils/format";

const DAY = 86_400_000;
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dayKey = (time: number) => dayKeyFormatter.format(new Date(time));

const SCORE_BUCKETS = [
  { label: "0–2", min: 0, max: 2 },
  { label: "2–4", min: 2, max: 4 },
  { label: "4–5", min: 4, max: 5 },
  { label: "5–6,5", min: 5, max: 6.5 },
  { label: "6,5–8", min: 6.5, max: 8 },
  { label: "8–10", min: 8, max: 10.01 }
];

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const [{ data: classes }, { data: exams }] = await Promise.all([
    supabase.from("classes").select("id, name, class_students(student_id)").eq("teacher_id", teacher.id),
    supabase
      .from("exams")
      .select(
        "id, title, status, total_score, created_at, exam_assignments(class_id, end_time), submissions(id, student_id, status, final_score, submitted_at, profiles(full_name)), exam_questions(question_type, correct_answer, correct_answers_json)"
      )
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
  ]);

  const now = Date.now();
  const studentsByClass = new Map((classes ?? []).map((item: any) => [item.id, (item.class_students ?? []).map((row: any) => row.student_id as string)]));
  const allStudents = new Set(Array.from(studentsByClass.values()).flat());
  const examList: any[] = exams ?? [];

  // Mọi bài đã nộp, điểm quy về thang 10.
  const submissions = examList.flatMap((exam) =>
    (exam.submissions ?? [])
      .filter((row: any) => row.status !== "doing" && row.submitted_at)
      .map((row: any) => ({
        id: row.id as string,
        examId: exam.id as string,
        examTitle: exam.title as string,
        studentId: row.student_id as string,
        studentName: (row.profiles?.full_name as string) ?? "Học sinh",
        score10: (Number(row.final_score ?? 0) / Number(exam.total_score || 10)) * 10,
        rawScore: Number(row.final_score ?? 0),
        at: new Date(row.submitted_at).getTime()
      }))
  );

  // ---- Chỉ số chính ----
  const inRange = (from: number, to: number) => submissions.filter((row) => row.at >= now - from && row.at < now - to);
  const week = inRange(7 * DAY, 0);
  const prevWeek = inRange(14 * DAY, 7 * DAY);
  const month = inRange(30 * DAY, 0);
  const prevMonth = inRange(60 * DAY, 30 * DAY);
  const average = (rows: typeof submissions) => (rows.length ? rows.reduce((sum, row) => sum + row.score10, 0) / rows.length : null);
  const monthAvg = average(month);
  const prevMonthAvg = average(prevMonth);
  const openList = examList.filter((exam) => exam.status === "open");
  const draftCount = examList.filter((exam) => exam.status === "draft").length;

  // ---- Biểu đồ bài nộp 14 ngày ----
  const dailyCounts = new Map<string, number>();
  submissions.forEach((row) => dailyCounts.set(dayKey(row.at), (dailyCounts.get(dayKey(row.at)) ?? 0) + 1));
  const dailyData: ColumnDatum[] = Array.from({ length: 14 }, (_, index) => {
    const key = dayKey(now - (13 - index) * DAY);
    const [, monthPart, dayPart] = key.split("-");
    const value = dailyCounts.get(key) ?? 0;
    return { key, label: `${dayPart}/${monthPart}`, value, tooltip: `${dayPart}/${monthPart}: ${value} bài nộp` };
  });

  // ---- Phân bố điểm 30 ngày ----
  const distribution: ColumnDatum[] = SCORE_BUCKETS.map((bucket) => {
    const value = month.filter((row) => row.score10 >= bucket.min && row.score10 < bucket.max).length;
    return { key: bucket.label, label: bucket.label, value, tooltip: `${bucket.label} điểm: ${value} bài` };
  });
  const belowFive = month.filter((row) => row.score10 < 5).length;

  // ---- Đề đang mở ----
  const openExams = openList
    .map((exam) => {
      const assigned = new Set<string>((exam.exam_assignments ?? []).flatMap((row: any) => studentsByClass.get(row.class_id) ?? []));
      const done = submissions.filter((row) => row.examId === exam.id && assigned.has(row.studentId));
      const endTimes = (exam.exam_assignments ?? [])
        .map((row: any) => row.end_time)
        .filter(Boolean)
        .map((value: string) => new Date(value).getTime())
        .filter((time: number) => time > now);
      const deadline = endTimes.length ? Math.min(...endTimes) : null;
      return { exam, total: assigned.size, done: done.length, avg: average(done), deadline };
    })
    .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));

  // ---- Việc cần làm ----
  const todos = [
    ...examList
      .filter((exam) => exam.status === "draft")
      .map((exam) => {
        const steps = getExamSetupSteps({ questions: exam.exam_questions ?? [], assignmentCount: (exam.exam_assignments ?? []).length, status: exam.status });
        const text = !steps.answerKeyDone ? `Còn ${steps.missingAnswers} câu/ý chưa có đáp án` : !steps.assigned ? "Chưa giao lớp" : "Chưa mở cho học sinh";
        return { key: exam.id, href: `/teacher/exams/${exam.id}`, title: exam.title, text, urgent: false };
      }),
    ...openExams
      .filter((row) => row.deadline && row.deadline - now < DAY && row.done < row.total)
      .map((row) => ({
        key: `due-${row.exam.id}`,
        href: `/teacher/exams/${row.exam.id}/results`,
        title: row.exam.title,
        text: `Hết hạn ${formatDateTime(new Date(row.deadline!).toISOString())} · ${row.total - row.done} em chưa nộp`,
        urgent: true
      }))
  ].sort((a, b) => Number(b.urgent) - Number(a.urgent));

  // ---- Học sinh cần chú ý ----
  const byStudent = new Map<string, typeof submissions>();
  submissions.forEach((row) => {
    if (!allStudents.has(row.studentId)) return;
    byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row]);
  });
  const flagged = Array.from(byStudent.values())
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => a.at - b.at);
      const last = sorted[sorted.length - 1];
      const reasons: string[] = [];
      if (last.score10 < 5) reasons.push(`${formatScore(last.score10)}/10 đề gần nhất`);
      const n = sorted.length;
      if (n >= 3 && sorted[n - 1].score10 < sorted[n - 2].score10 && sorted[n - 2].score10 < sorted[n - 3].score10) reasons.push("Giảm 2 đề liên tiếp");
      return { studentId: last.studentId, name: last.studentName, reasons, score: last.score10 };
    })
    .filter((row) => row.reasons.length)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  const recent = [...submissions].sort((a, b) => b.at - a.at).slice(0, 6);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(new Date(now)));
  const greeting = hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const today = new Intl.DateTimeFormat("vi-VN", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(now));
  const pendingTotal = openExams.reduce((sum, row) => sum + Math.max(0, row.total - row.done), 0);

  return (
    <div className="grid gap-6">
      {/* Banner chào */}
      <section className="bg-brand relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_24px_50px_-24px_rgba(6,182,212,0.8)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.28),transparent_40%),radial-gradient(circle_at_10%_120%,rgba(79,70,229,0.5),transparent_50%)]" />
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none text-[140px] font-black leading-none text-white/10">Σ</span>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold capitalize text-white/80">{today}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
              {greeting}, {teacher.full_name}
            </h1>
            <p className="mt-2 max-w-xl text-white/85">
              {openList.length
                ? `Bạn có ${openList.length} đề đang mở${pendingTotal ? `, còn ${pendingTotal} lượt học sinh chưa nộp` : ", tất cả học sinh đã nộp"}.`
                : "Hiện chưa có đề nào đang mở. Tạo đề mới và giao cho lớp nhé."}
              {todos.length ? ` ${todos.length} việc cần xử lý.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/teacher/exams/create" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-teal-700 shadow-lg transition hover:bg-teal-50">
              <FilePlus2 size={18} />
              Tạo đề mới
            </Link>
            <Link href="/teacher/classes" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25">
              <GraduationCap size={18} />
              Lớp học
            </Link>
          </div>
        </div>
      </section>

      {/* Chỉ số chính */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} tone="from-sky-500 to-indigo-500" label="Học sinh" value={String(allStudents.size)} hint={`${classes?.length ?? 0} lớp`} />
        <StatTile icon={Unlock} tone="from-emerald-500 to-teal-500" label="Đề đang mở" value={String(openList.length)} hint={`${draftCount} bản nháp · ${examList.length} đề`} />
        <StatTile
          icon={ClipboardCheck}
          tone="from-teal-500 to-cyan-500"
          label="Bài nộp 7 ngày"
          value={String(week.length)}
          delta={week.length - prevWeek.length}
          deltaText={`${formatSigned(week.length - prevWeek.length)} so với tuần trước`}
        />
        <StatTile
          icon={BookOpen}
          tone="from-violet-500 to-fuchsia-500"
          label="Điểm TB 30 ngày"
          value={monthAvg === null ? "-" : formatScore(Math.round(monthAvg * 100) / 100)}
          suffix={monthAvg === null ? undefined : "/10"}
          delta={monthAvg !== null && prevMonthAvg !== null ? monthAvg - prevMonthAvg : undefined}
          deltaText={monthAvg !== null && prevMonthAvg !== null ? `${formatSigned(Math.round((monthAvg - prevMonthAvg) * 100) / 100)} so với 30 ngày trước` : "Chưa có dữ liệu kỳ trước"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-6">
          {/* Biểu đồ */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Bài nộp 14 ngày qua" subtitle={`Tổng ${dailyData.reduce((sum, item) => sum + item.value, 0)} bài`}>
              <ColumnChart data={dailyData} valueLabel="bài nộp" showEveryNthLabel={3} tableCaption="Số bài nộp theo ngày" />
            </Card>
            <Card
              title="Phân bố điểm 30 ngày"
              subtitle={month.length ? `${month.length} bài · ${Math.round((belowFive / month.length) * 100)}% dưới 5 điểm` : "Chưa có bài nộp"}
            >
              <ColumnChart data={distribution} valueLabel="bài" tableCaption="Số bài theo khoảng điểm (thang 10)" />
            </Card>
          </div>

          {/* Đề đang mở */}
          <Card
            title="Đề đang mở"
            subtitle="Tiến độ nộp bài của học sinh được giao"
            action={<Link href="/teacher/exams?status=open" className="text-sm font-bold text-teal-700 hover:text-teal-900">Xem tất cả</Link>}
            flush
          >
            {!openExams.length ? (
              <EmptyRow text="Không có đề nào đang mở." />
            ) : (
              <div className="divide-y divide-slate-100">
                {openExams.slice(0, 6).map(({ exam, total, done, avg, deadline }) => {
                  const percent = total ? Math.round((done / total) * 100) : 0;
                  const dueSoon = deadline !== null && deadline - now < DAY;
                  return (
                    <Link key={exam.id} href={`/teacher/exams/${exam.id}/results`} className="grid gap-3 p-4 transition hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_200px_90px_20px] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-950">{exam.title}</p>
                        <p className={cn("mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold", dueSoon ? "text-amber-700" : "text-slate-500")}>
                          <CalendarClock size={13} />
                          {deadline ? `${dueSoon ? "Sắp hết hạn · " : "Hạn "}${formatDateTime(new Date(deadline).toISOString())}` : "Không giới hạn thời gian"}
                        </p>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold text-slate-600">Đã nộp</span>
                          <span className="font-bold tabular-nums text-slate-900">{done}/{total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                      <div className="text-sm sm:text-right">
                        <span className="text-xs text-slate-500 sm:block">Điểm TB </span>
                        <span className="font-bold text-slate-900">{avg === null ? "-" : formatScore(Math.round(avg * 100) / 100)}</span>
                      </div>
                      <ChevronRight size={18} className="hidden text-slate-400 sm:block" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <aside className="grid content-start gap-6">
          <Card title="Việc cần làm" badge={todos.length} flush>
            {!todos.length ? (
              <EmptyRow text="Không có việc nào tồn đọng 🎉" />
            ) : (
              <div className="divide-y divide-slate-100">
                {todos.slice(0, 6).map((todo) => (
                  <Link key={todo.key} href={todo.href} className="flex items-start gap-3 p-4 transition hover:bg-slate-50/70">
                    <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", todo.urgent ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700")}>
                      <AlertTriangle size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">{todo.title}</span>
                      <span className={cn("block text-xs font-semibold", todo.urgent ? "text-rose-600" : "text-amber-700")}>{todo.text}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Học sinh cần chú ý" badge={flagged.length} flush>
            {!flagged.length ? (
              <EmptyRow text="Chưa có học sinh nào cần chú ý." />
            ) : (
              <div className="divide-y divide-slate-100">
                {flagged.map((row) => (
                  <Link key={row.studentId} href={`/teacher/students/${row.studentId}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50/70">
                    <Initials name={row.name} tone="from-rose-500 to-orange-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">{row.name}</span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                        <TrendingDown size={13} />
                        {row.reasons.join(" · ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Bài nộp gần đây" flush>
            {!recent.length ? (
              <EmptyRow text="Chưa có bài nộp nào." />
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((row) => (
                  <Link key={row.id} href={`/teacher/exams/${row.examId}/results/${row.id}`} className="flex items-center gap-3 p-4 transition hover:bg-slate-50/70">
                    <Initials name={row.studentName} tone="from-indigo-500 to-cyan-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950">{row.studentName}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {row.examTitle} · {timeAgo(now - row.at)}
                      </span>
                    </span>
                    <ScoreBadge score={Math.round(row.score10 * 100) / 100} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
  hint,
  delta,
  deltaText
}: {
  icon: React.ElementType;
  tone: string;
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  delta?: number;
  deltaText?: string;
}) {
  const up = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;
  return (
    <div className="surface p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", tone)}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
        {value}
        {suffix ? <span className="ml-0.5 text-lg font-bold text-slate-400">{suffix}</span> : null}
      </p>
      {deltaText ? (
        <p className={cn("mt-1.5 flex items-center gap-1 text-xs font-semibold", up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-500")}>
          {up ? <ArrowUpRight size={14} /> : down ? <ArrowDownRight size={14} /> : null}
          {deltaText}
        </p>
      ) : (
        <p className="mt-1.5 text-xs font-semibold text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  badge,
  flush,
  children
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: number;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="surface overflow-visible">
      <div className={cn("flex items-start justify-between gap-3 p-5", flush ? "border-b border-slate-100" : "pb-3")}>
        <div>
          <h2 className="flex items-center gap-2 font-black text-slate-950">
            {title}
            {badge ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{badge}</span> : null}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className={flush ? "" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 p-5 text-sm text-slate-500">
      <Inbox size={16} className="text-slate-400" />
      {text}
    </p>
  );
}

function Initials({ name, tone }: { name: string; tone: string }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
  return <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white", tone)}>{initials || "?"}</span>;
}

function formatSigned(value: number) {
  if (value === 0) return "Không đổi";
  return `${value > 0 ? "+" : "−"}${formatScore(Math.abs(value))}`;
}

function timeAgo(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} ngày trước` : `${Math.floor(days / 30)} tháng trước`;
}
