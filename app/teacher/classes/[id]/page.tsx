import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarClock,
  FileText,
  Mail,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video
} from "lucide-react";
import {
  addClassRecording,
  addStudentToClass,
  assignExamFromClass,
  createStudentAndAddToClass,
  deleteClass,
  deleteClassRecording,
  removeStudentFromClass,
  unassignExam,
  updateClass
} from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ExamStatusBadge, ScoreBadge } from "@/components/exam/Badges";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordingCard } from "@/components/recordings/RecordingCard";
import { Input, Select } from "@/components/ui/input";
import { TabNav } from "@/components/ui/TabNav";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { parseMonth } from "@/lib/schedule";
import { attendanceRate, loadAttendanceSummary } from "@/lib/schedule-data";
import { cn, formatDateTime } from "@/lib/utils/format";

const TABS = ["students", "schedule", "exams", "recordings", "settings"] as const;
type Tab = (typeof TABS)[number];

const AVATAR_TONES = [
  "from-teal-500 to-cyan-500",
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-lime-500"
];

export default async function ClassDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string | string[]; month?: string | string[] }>;
}) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const resolvedParams = (await searchParams) ?? {};
  const rawTab = resolvedParams.tab;
  const rawMonth = Array.isArray(resolvedParams.month) ? resolvedParams.month[0] : resolvedParams.month;
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const tab: Tab = TABS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "students";
  const supabase = createServiceClient();

  const { data: classInfo } = await supabase.from("classes").select("*").eq("id", id).eq("teacher_id", teacher.id).maybeSingle();
  if (!classInfo) notFound();

  const [{ data: students }, { data: assignments }, { data: recordings }] = await Promise.all([
    supabase.from("class_students").select("student_id, created_at, profiles(id, full_name)").eq("class_id", id),
    supabase
      .from("exam_assignments")
      .select("id, exam_id, start_time, end_time, created_at, exams(id, title, status, duration_minutes)")
      .eq("class_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("class_recordings")
      .select("*")
      .eq("class_id", id)
      .order("recorded_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
  ]);

  const base = `/teacher/classes/${id}`;
  const studentIds = (students ?? []).map((row: any) => row.student_id);
  const examIds = (assignments ?? []).map((row: any) => row.exam_id);

  return (
    <>
      <Link href="/teacher/classes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} />
        Tất cả lớp
      </Link>

      <section className="bg-brand relative mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-[0_24px_50px_-24px_rgba(6,182,212,0.8)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.28),transparent_40%),radial-gradient(circle_at_0%_120%,rgba(79,70,229,0.5),transparent_50%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Lớp học</p>
            <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl">{classInfo.name}</h1>
            {classInfo.description ? <p className="mt-1.5 max-w-2xl text-white/85">{classInfo.description}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <HeroStat icon={Users} value={students?.length ?? 0} label="học sinh" />
            <HeroStat icon={BookOpen} value={assignments?.length ?? 0} label="đề" />
            <HeroStat icon={Video} value={recordings?.length ?? 0} label="buổi học" />
          </div>
        </div>
      </section>

      <TabNav
        activeHref={`${base}?tab=${tab}`}
        items={[
          { href: `${base}?tab=students`, label: "Học sinh", badge: students?.length ?? 0 },
          { href: `${base}?tab=schedule`, label: "Lịch học" },
          { href: `${base}?tab=exams`, label: "Đề đã giao", badge: assignments?.length ?? 0 },
          { href: `${base}?tab=recordings`, label: "Buổi học", badge: recordings?.length ?? 0 },
          { href: `${base}?tab=settings`, label: "Cài đặt" }
        ]}
      />

      {tab === "students" ? <StudentsTab classId={id} students={students ?? []} studentIds={studentIds} examIds={examIds} /> : null}
      {tab === "schedule" ? (
        <ScheduleView
          role="teacher"
          classes={[classInfo]}
          month={parseMonth(rawMonth)}
          showClassFilter={false}
          buildHref={({ month }) => (month ? `${base}?tab=schedule&month=${month}` : `${base}?tab=schedule`)}
        />
      ) : null}
      {tab === "exams" ? <ExamsTab classId={id} teacherId={teacher.id} assignments={assignments ?? []} studentIds={studentIds} /> : null}
      {tab === "recordings" ? <RecordingsTab classId={id} recordings={recordings ?? []} /> : null}
      {tab === "settings" ? <SettingsTab classInfo={classInfo} /> : null}
    </>
  );
}

// ---------------- Học sinh ----------------

async function StudentsTab({ classId, students, studentIds, examIds }: { classId: string; students: any[]; studentIds: string[]; examIds: string[] }) {
  const supabase = createServiceClient();
  const { data: submissions } =
    studentIds.length && examIds.length
      ? await supabase.from("submissions").select("student_id, status, final_score").in("student_id", studentIds).in("exam_id", examIds).neq("status", "doing")
      : { data: [] as Array<{ student_id: string; status: string; final_score: number }> };

  const attendance = await loadAttendanceSummary(studentIds, [classId]);
  const statsByStudent = new Map<string, { count: number; total: number }>();
  (submissions ?? []).forEach((row) => {
    const stats = statsByStudent.get(row.student_id) ?? { count: 0, total: 0 };
    stats.count += 1;
    stats.total += Number(row.final_score ?? 0);
    statsByStudent.set(row.student_id, stats);
  });

  // Xếp theo điểm TB giảm dần, học sinh chưa làm đề nào xếp cuối theo tên.
  const rows = students
    .map((row: any) => {
      const stats = statsByStudent.get(row.student_id);
      const summary = attendance.get(row.student_id);
      return {
        id: row.student_id as string,
        name: (row.profiles?.full_name as string) ?? "-",
        count: stats?.count ?? 0,
        avg: stats?.count ? stats.total / stats.count : null,
        attendanceRate: attendanceRate(summary),
        absent: summary?.absent ?? 0
      };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1) || a.name.localeCompare(b.name, "vi"));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="surface self-start overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-black text-slate-950">Danh sách học sinh</h2>
            <p className="text-xs font-medium text-slate-500">Xếp theo điểm trung bình các đề đã giao cho lớp</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{rows.length} học sinh</span>
        </div>

        {!rows.length ? (
          <div className="p-6">
            <EmptyState title="Lớp chưa có học sinh" description="Thêm học sinh bằng khung bên cạnh." />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const percent = examIds.length ? Math.round((row.count / examIds.length) * 100) : 0;
              return (
                <li key={row.id} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-teal-50/40">
                  <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-400">{row.avg !== null ? index + 1 : "–"}</span>
                  <Avatar name={row.name} />
                  <Link href={`/teacher/students/${row.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-950 group-hover:text-teal-800">{row.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 sm:w-40">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {row.count}/{examIds.length} đề
                      </span>
                      {row.attendanceRate !== null ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            row.attendanceRate >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}
                          title={`Vắng ${row.absent} buổi`}
                        >
                          Chuyên cần {row.attendanceRate}%
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  <div className="hidden w-24 shrink-0 text-right sm:block">
                    {row.avg !== null ? <ScoreBadge score={Math.round(row.avg * 100) / 100} /> : <span className="text-xs font-semibold text-slate-400">Chưa làm</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/teacher/students/${row.id}`}
                      className="hidden h-9 items-center rounded-lg px-3 text-xs font-bold text-teal-700 transition hover:bg-teal-100/60 md:inline-flex"
                    >
                      Hồ sơ
                    </Link>
                    <form action={removeStudentFromClass.bind(null, classId, row.id)}>
                      <ConfirmSubmitButton
                        variant="secondary"
                        className="h-9 gap-1.5 border-rose-200 bg-rose-50 px-2.5 text-xs text-rose-600 shadow-none hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 sm:px-3"
                        message={`Xoá ${row.name} khỏi lớp này? Tài khoản và bài làm vẫn được giữ.`}
                      >
                        <UserMinus size={15} aria-hidden />
                        <span className="hidden sm:inline">Xoá khỏi lớp</span>
                        <span className="sr-only sm:hidden">Xoá {row.name} khỏi lớp</span>
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="surface self-start overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
            <UserPlus size={19} />
          </span>
          <div>
            <h2 className="font-black text-slate-950">Thêm học sinh</h2>
            <p className="text-xs font-medium text-slate-500">Tạo tài khoản mới hoặc thêm bằng email</p>
          </div>
        </div>
        <ActionForm action={createStudentAndAddToClass.bind(null, classId)} className="grid gap-2.5 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tài khoản mới</p>
          <Input name="full_name" placeholder="Họ tên học sinh" required />
          <Input name="email" type="email" placeholder="Email đăng nhập" required />
          <Input name="password" type="text" placeholder="Mật khẩu ban đầu (≥ 6 ký tự)" required minLength={6} />
          <SubmitButton pendingText="Đang tạo...">Tạo và thêm vào lớp</SubmitButton>
        </ActionForm>
        <div className="mx-5 flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          hoặc
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <ActionForm action={addStudentToClass.bind(null, classId)} className="grid gap-2.5 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã có tài khoản</p>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-10" name="email" type="email" placeholder="Email học sinh" required />
          </div>
          <SubmitButton variant="secondary" pendingText="Đang thêm...">Thêm vào lớp</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}

// ---------------- Đề đã giao ----------------

async function ExamsTab({ classId, teacherId, assignments, studentIds }: { classId: string; teacherId: string; assignments: any[]; studentIds: string[] }) {
  const supabase = createServiceClient();
  const assignedExamIds = assignments.map((row) => row.exam_id);
  const [{ data: exams }, { data: submissions }] = await Promise.all([
    supabase.from("exams").select("id, title, status").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
    assignedExamIds.length && studentIds.length
      ? supabase.from("submissions").select("exam_id, status, final_score").in("exam_id", assignedExamIds).in("student_id", studentIds).neq("status", "doing")
      : Promise.resolve({ data: [] as Array<{ exam_id: string; status: string; final_score: number }> })
  ]);
  const available = (exams ?? []).filter((exam) => !assignedExamIds.includes(exam.id));

  return (
    <div className="grid gap-6">
      {available.length ? (
        <ActionForm action={assignExamFromClass.bind(null, classId)} className="surface grid gap-4 p-5 lg:grid-cols-[auto_2fr_1fr_1fr_auto] lg:items-end">
          <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md lg:flex">
            <Send size={19} />
          </span>
          <label className="text-sm font-bold text-slate-700">
            Giao thêm đề cho lớp
            <Select className="mt-1.5" name="exam_id" required defaultValue="">
              <option value="" disabled>Chọn đề...</option>
              {available.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                  {exam.status === "draft" ? " (bản nháp)" : exam.status === "closed" ? " (đã đóng)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Bắt đầu
            <Input className="mt-1.5" name="start_time" type="datetime-local" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Kết thúc
            <Input className="mt-1.5" name="end_time" type="datetime-local" />
          </label>
          <SubmitButton pendingText="Đang giao...">Giao đề</SubmitButton>
        </ActionForm>
      ) : null}

      {!assignments.length ? (
        <EmptyState title="Chưa giao đề nào" description="Chọn một đề ở trên để giao cho lớp này." />
      ) : (
        <div className="grid gap-3">
          {assignments.map((assignment) => {
            const done = (submissions ?? []).filter((row) => row.exam_id === assignment.exam_id);
            const average = done.length ? done.reduce((sum, row) => sum + Number(row.final_score ?? 0), 0) / done.length : null;
            const percent = studentIds.length ? Math.round((done.length / studentIds.length) * 100) : 0;
            return (
              <article key={assignment.id} className="surface grid gap-4 p-5 transition hover:border-teal-200 md:grid-cols-[minmax(0,1fr)_220px_110px_auto] md:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-black text-slate-950">{assignment.exams?.title}</h3>
                      <ExamStatusBadge status={assignment.exams?.status ?? "draft"} />
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <CalendarClock size={13} />
                      {assignment.start_time || assignment.end_time
                        ? `${formatDateTime(assignment.start_time)} → ${formatDateTime(assignment.end_time)}`
                        : "Không giới hạn thời gian"}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-slate-500">Đã nộp</span>
                    <span className="font-bold tabular-nums text-slate-900">
                      {done.length}/{studentIds.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div className="md:text-center">
                  {average !== null ? <ScoreBadge score={Math.round(average * 100) / 100} /> : <span className="text-xs font-semibold text-slate-400">Chưa có điểm</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/teacher/exams/${assignment.exam_id}/results?class=${classId}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-50 px-3 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                  >
                    <BarChart3 size={15} />
                    Kết quả
                  </Link>
                  <form action={unassignExam.bind(null, assignment.exam_id, classId)}>
                    <IconDangerButton label="Gỡ đề khỏi lớp" message={`Gỡ đề "${assignment.exams?.title}" khỏi lớp? Bài đã nộp vẫn được giữ.`} />
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Buổi học ----------------

function RecordingsTab({ classId, recordings }: { classId: string; recordings: any[] }) {
  return (
    <div className="grid gap-6">
      <ActionForm action={addClassRecording.bind(null, classId)} className="surface grid gap-4 p-5 lg:grid-cols-[auto_1.2fr_2fr_170px_auto] lg:items-end">
        <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md lg:flex">
          <Video size={19} />
        </span>
        <label className="text-sm font-bold text-slate-700">
          Tên buổi học
          <Input className="mt-1.5" name="title" placeholder="VD: Buổi 3 - Tích phân" required />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Link record
          <Input className="mt-1.5" name="url" type="url" placeholder="https://youtube.com/..." required />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Ngày học
          <Input className="mt-1.5" name="recorded_at" type="date" />
        </label>
        <SubmitButton pendingText="Đang thêm...">Thêm buổi học</SubmitButton>
      </ActionForm>

      {!recordings.length ? (
        <EmptyState title="Chưa có buổi học nào" description="Thêm link record, học sinh trong lớp sẽ xem được ở mục Buổi học." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              action={
                <form action={deleteClassRecording.bind(null, classId, recording.id)}>
                  <IconDangerButton label="Xoá buổi học" message={`Xoá buổi học "${recording.title}"?`} />
                </form>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Cài đặt ----------------

function SettingsTab({ classInfo }: { classInfo: any }) {
  return (
    <div className="grid max-w-3xl gap-5">
      <ActionForm action={updateClass.bind(null, classInfo.id)} className="surface grid gap-4 p-5">
        <h2 className="font-black text-slate-950">Thông tin lớp</h2>
        <label className="text-sm font-bold text-slate-700">
          Tên lớp
          <Input className="mt-1.5" name="name" defaultValue={classInfo.name ?? ""} required />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Mô tả
          <Input className="mt-1.5" name="description" defaultValue={classInfo.description ?? ""} />
        </label>
        <SubmitButton className="w-fit">Lưu thay đổi</SubmitButton>
      </ActionForm>
      <section className="surface grid gap-3 border-rose-200/80 p-5">
        <h2 className="font-black text-rose-700">Xoá lớp</h2>
        <p className="text-sm text-slate-600">Xoá lớp sẽ gỡ học sinh khỏi lớp, gỡ các đề đã giao và link record. Tài khoản học sinh và bài đã nộp vẫn được giữ.</p>
        <form action={deleteClass.bind(null, classInfo.id)}>
          <ConfirmSubmitButton message={`Xoá lớp ${classInfo.name}?`}>Xoá lớp</ConfirmSubmitButton>
        </form>
      </section>
    </div>
  );
}

// ---------------- Thành phần nhỏ ----------------

function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2 ring-1 ring-white/25 backdrop-blur">
      <Icon size={17} className="text-white/85" />
      <span className="text-lg font-black">{value}</span>
      <span className="text-sm font-semibold text-white/80">{label}</span>
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ring-2 ring-white", AVATAR_TONES[hash % AVATAR_TONES.length])}>
      {initials}
    </span>
  );
}

function IconDangerButton({ label, message }: { label: string; message: string }) {
  return (
    <ConfirmSubmitButton
      variant="secondary"
      className="h-9 w-9 border-rose-200 bg-rose-50 px-0 text-rose-600 shadow-none hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700"
      message={message}
    >
      <Trash2 size={16} aria-hidden />
      <span className="sr-only">{label}</span>
    </ConfirmSubmitButton>
  );
}
