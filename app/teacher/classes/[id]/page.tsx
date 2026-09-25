import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, UserPlus } from "lucide-react";
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
import { ExamStatusBadge } from "@/components/exam/Badges";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/input";
import { TabNav } from "@/components/ui/TabNav";
import { formatDate, formatDateTime, formatScore } from "@/lib/utils/format";

const TABS = ["students", "exams", "recordings", "settings"] as const;
type Tab = (typeof TABS)[number];

export default async function ClassDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const rawTab = (await searchParams)?.tab;
  const tab: Tab = TABS.includes((Array.isArray(rawTab) ? rawTab[0] : rawTab) as Tab) ? ((Array.isArray(rawTab) ? rawTab[0] : rawTab) as Tab) : "students";
  const supabase = createServiceClient();

  const { data: classInfo } = await supabase.from("classes").select("*").eq("id", id).eq("teacher_id", teacher.id).maybeSingle();
  if (!classInfo) notFound();

  const [{ data: students }, { data: assignments }, { data: recordings }] = await Promise.all([
    supabase.from("class_students").select("student_id, profiles(id, full_name)").eq("class_id", id),
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
      <Link href="/teacher/classes" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} />
        Tất cả lớp
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{classInfo.name}</h1>
        {classInfo.description ? <p className="mt-1 text-slate-600">{classInfo.description}</p> : null}
      </header>

      <TabNav
        activeHref={`${base}?tab=${tab}`}
        items={[
          { href: `${base}?tab=students`, label: "Học sinh", badge: students?.length ?? 0 },
          { href: `${base}?tab=exams`, label: "Đề đã giao", badge: assignments?.length ?? 0 },
          { href: `${base}?tab=recordings`, label: "Buổi học", badge: recordings?.length ?? 0 },
          { href: `${base}?tab=settings`, label: "Cài đặt" }
        ]}
      />

      {tab === "students" ? <StudentsTab classId={id} students={students ?? []} studentIds={studentIds} examIds={examIds} /> : null}
      {tab === "exams" ? <ExamsTab classId={id} teacherId={teacher.id} assignments={assignments ?? []} studentIds={studentIds} /> : null}
      {tab === "recordings" ? <RecordingsTab classId={id} recordings={recordings ?? []} /> : null}
      {tab === "settings" ? <SettingsTab classInfo={classInfo} /> : null}
    </>
  );
}

async function StudentsTab({ classId, students, studentIds, examIds }: { classId: string; students: any[]; studentIds: string[]; examIds: string[] }) {
  const supabase = createServiceClient();
  const { data: submissions } =
    studentIds.length && examIds.length
      ? await supabase.from("submissions").select("student_id, status, final_score").in("student_id", studentIds).in("exam_id", examIds).neq("status", "doing")
      : { data: [] as Array<{ student_id: string; status: string; final_score: number }> };

  const statsByStudent = new Map<string, { count: number; total: number }>();
  (submissions ?? []).forEach((row) => {
    const stats = statsByStudent.get(row.student_id) ?? { count: 0, total: 0 };
    stats.count += 1;
    stats.total += Number(row.final_score ?? 0);
    statsByStudent.set(row.student_id, stats);
  });
  const sorted = [...students].sort((a, b) => String(a.profiles?.full_name ?? "").localeCompare(String(b.profiles?.full_name ?? ""), "vi"));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="table-shell self-start">
        {!sorted.length ? (
          <div className="p-6 text-sm text-slate-600">Lớp chưa có học sinh. Thêm học sinh ở khung bên cạnh.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3">Đã làm</th>
                  <th className="p-3">Điểm TB</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row: any) => {
                  const stats = statsByStudent.get(row.student_id);
                  return (
                    <tr key={row.student_id} className="border-t">
                      <td className="p-3 font-medium">
                        <Link href={`/teacher/students/${row.student_id}`} className="text-teal-700 hover:underline">{row.profiles?.full_name ?? "-"}</Link>
                      </td>
                      <td className="p-3">{stats?.count ?? 0}/{examIds.length} đề</td>
                      <td className="p-3 font-semibold">{stats?.count ? formatScore(stats.total / stats.count) : "-"}</td>
                      <td className="p-3 text-right">
                        <form action={removeStudentFromClass.bind(null, classId, row.student_id)}>
                          <ConfirmSubmitButton variant="secondary" className="h-9 px-3" message={`Xoá ${row.profiles?.full_name ?? "học sinh"} khỏi lớp này? Tài khoản và bài làm vẫn được giữ.`}>
                            Xoá khỏi lớp
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="surface grid gap-5 self-start p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <UserPlus size={20} />
          </div>
          <h2 className="font-semibold">Thêm học sinh</h2>
        </div>
        <ActionForm action={createStudentAndAddToClass.bind(null, classId)} className="grid gap-2">
          <p className="text-sm font-semibold text-slate-700">Tạo tài khoản mới</p>
          <Input name="full_name" placeholder="Họ tên học sinh" required />
          <Input name="email" type="email" placeholder="Email đăng nhập" required />
          <Input name="password" type="text" placeholder="Mật khẩu ban đầu (tối thiểu 6 ký tự)" required minLength={6} />
          <SubmitButton pendingText="Đang tạo...">Tạo và thêm vào lớp</SubmitButton>
        </ActionForm>
        <ActionForm action={addStudentToClass.bind(null, classId)} className="grid gap-2 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700">Học sinh đã có tài khoản</p>
          <Input name="email" type="email" placeholder="Email học sinh" required />
          <SubmitButton variant="secondary" pendingText="Đang thêm...">Thêm vào lớp</SubmitButton>
        </ActionForm>
      </aside>
    </div>
  );
}

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
    <div className="grid gap-5">
      {available.length ? (
        <ActionForm action={assignExamFromClass.bind(null, classId)} className="surface grid gap-3 p-4 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <label className="text-sm font-medium">
            Giao thêm đề
            <Select className="mt-1" name="exam_id" required defaultValue="">
              <option value="" disabled>Chọn đề...</option>
              {available.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}{exam.status === "draft" ? " (bản nháp)" : exam.status === "closed" ? " (đã đóng)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Bắt đầu
            <Input className="mt-1" name="start_time" type="datetime-local" />
          </label>
          <label className="text-sm font-medium">
            Kết thúc
            <Input className="mt-1" name="end_time" type="datetime-local" />
          </label>
          <SubmitButton pendingText="Đang giao...">Giao đề</SubmitButton>
        </ActionForm>
      ) : null}

      {!assignments.length ? (
        <EmptyState title="Chưa giao đề nào" description="Chọn một đề ở trên để giao cho lớp này." />
      ) : (
        <section className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="p-3">Tên đề</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Khung giờ</th>
                  <th className="p-3">Đã nộp</th>
                  <th className="p-3">Điểm TB</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const done = (submissions ?? []).filter((row) => row.exam_id === assignment.exam_id);
                  const average = done.length ? done.reduce((sum, row) => sum + Number(row.final_score ?? 0), 0) / done.length : null;
                  return (
                    <tr key={assignment.id} className="border-t">
                      <td className="p-3 font-medium">
                        <Link href={`/teacher/exams/${assignment.exam_id}/results?class=${classId}`} className="text-teal-700 hover:underline">
                          {assignment.exams?.title}
                        </Link>
                      </td>
                      <td className="p-3"><ExamStatusBadge status={assignment.exams?.status ?? "draft"} /></td>
                      <td className="p-3 text-slate-600">
                        {assignment.start_time || assignment.end_time
                          ? `${formatDateTime(assignment.start_time)} → ${formatDateTime(assignment.end_time)}`
                          : "Không giới hạn"}
                      </td>
                      <td className="p-3">{done.length}/{studentIds.length}</td>
                      <td className="p-3 font-semibold">{average === null ? "-" : formatScore(average)}</td>
                      <td className="p-3 text-right">
                        <form action={unassignExam.bind(null, assignment.exam_id, classId)}>
                          <ConfirmSubmitButton variant="secondary" className="h-9 px-3" message={`Gỡ đề "${assignment.exams?.title}" khỏi lớp? Bài đã nộp vẫn được giữ.`}>
                            Gỡ khỏi lớp
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function RecordingsTab({ classId, recordings }: { classId: string; recordings: any[] }) {
  return (
    <div className="grid gap-5">
      <ActionForm action={addClassRecording.bind(null, classId)} className="surface grid gap-3 p-4 lg:grid-cols-[1.2fr_2fr_170px_auto] lg:items-end">
        <label className="text-sm font-medium">
          Tên buổi học
          <Input className="mt-1" name="title" placeholder="VD: Buổi 3 - Tích phân" required />
        </label>
        <label className="text-sm font-medium">
          Link record
          <Input className="mt-1" name="url" type="url" placeholder="https://..." required />
        </label>
        <label className="text-sm font-medium">
          Ngày học
          <Input className="mt-1" name="recorded_at" type="date" />
        </label>
        <SubmitButton pendingText="Đang thêm...">Thêm link</SubmitButton>
      </ActionForm>

      {!recordings.length ? (
        <EmptyState title="Chưa có link record" description="Học sinh trong lớp sẽ thấy các link này ở mục Buổi học." />
      ) : (
        <section className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="p-3">Buổi học</th>
                  <th className="p-3">Ngày học</th>
                  <th className="p-3">Link</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((recording) => (
                  <tr key={recording.id} className="border-t">
                    <td className="p-3 font-medium">{recording.title}</td>
                    <td className="p-3">{formatDate(recording.recorded_at)}</td>
                    <td className="p-3">
                      <a href={recording.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline">
                        <ExternalLink size={15} />
                        Mở link
                      </a>
                    </td>
                    <td className="p-3 text-right">
                      <form action={deleteClassRecording.bind(null, classId, recording.id)}>
                        <ConfirmSubmitButton variant="secondary" className="h-9 px-3" message={`Xoá link record "${recording.title}"?`}>Xoá</ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SettingsTab({ classInfo }: { classInfo: any }) {
  return (
    <div className="grid max-w-3xl gap-5">
      <ActionForm action={updateClass.bind(null, classInfo.id)} className="surface grid gap-3 p-5">
        <h2 className="font-semibold">Thông tin lớp</h2>
        <label className="text-sm font-medium">
          Tên lớp
          <Input className="mt-1" name="name" defaultValue={classInfo.name ?? ""} required />
        </label>
        <label className="text-sm font-medium">
          Mô tả
          <Input className="mt-1" name="description" defaultValue={classInfo.description ?? ""} />
        </label>
        <SubmitButton className="w-fit">Lưu</SubmitButton>
      </ActionForm>
      <section className="surface grid gap-3 p-5">
        <h2 className="font-semibold text-rose-700">Xoá lớp</h2>
        <p className="text-sm text-slate-600">Xoá lớp sẽ gỡ học sinh khỏi lớp, gỡ các đề đã giao và link record. Tài khoản học sinh và bài đã nộp vẫn được giữ.</p>
        <form action={deleteClass.bind(null, classInfo.id)}>
          <ConfirmSubmitButton message={`Xoá lớp ${classInfo.name}?`}>Xoá lớp</ConfirmSubmitButton>
        </form>
      </section>
    </div>
  );
}
