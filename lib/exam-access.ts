import type { createServiceClient } from "@/lib/supabase/server";

type Supabase = ReturnType<typeof createServiceClient>;

export type ExamAccessReason = "not_assigned" | "not_open" | "closed" | "not_started" | "ended";

export type ExamAccess =
  | { ok: true; endsAt: string | null }
  | { ok: false; reason: ExamAccessReason; startsAt?: string | null; endsAt?: string | null };

type AssignmentWindow = { start_time: string | null; end_time: string | null };

// Học sinh chỉ được làm bài khi đề đã giao cho lớp của mình, đề đang mở và đang trong khung giờ giao.
export function evaluateExamAccess(examStatus: string | null | undefined, windows: AssignmentWindow[], now = Date.now()): ExamAccess {
  if (!windows.length) return { ok: false, reason: "not_assigned" };
  if (examStatus === "closed") return { ok: false, reason: "closed" };
  if (examStatus !== "open") return { ok: false, reason: "not_open" };

  const active = windows.filter((window) => {
    const startsOk = !window.start_time || new Date(window.start_time).getTime() <= now;
    const endsOk = !window.end_time || new Date(window.end_time).getTime() > now;
    return startsOk && endsOk;
  });
  if (active.length) {
    // Nếu học sinh ở nhiều lớp được giao cùng đề, lấy giờ kết thúc muộn nhất.
    const endsAt = active.some((window) => !window.end_time) ? null : latest(active.map((window) => window.end_time));
    return { ok: true, endsAt };
  }

  const upcoming = windows
    .map((window) => window.start_time)
    .filter((value): value is string => Boolean(value) && new Date(value!).getTime() > now)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  if (upcoming.length) return { ok: false, reason: "not_started", startsAt: upcoming[0] };
  return { ok: false, reason: "ended", endsAt: latest(windows.map((window) => window.end_time)) };
}

function latest(values: Array<string | null>) {
  const times = values.filter((value): value is string => Boolean(value));
  if (!times.length) return null;
  return times.reduce((max, value) => (new Date(value).getTime() > new Date(max).getTime() ? value : max));
}

export async function getStudentExamWindows(supabase: Supabase, examId: string, studentId: string) {
  const { data: memberships } = await supabase.from("class_students").select("class_id").eq("student_id", studentId);
  const classIds = memberships?.map((item) => item.class_id) ?? [];
  if (!classIds.length) return [] as AssignmentWindow[];
  const { data } = await supabase.from("exam_assignments").select("start_time, end_time").eq("exam_id", examId).in("class_id", classIds);
  return (data ?? []) as AssignmentWindow[];
}

export async function getStudentExamAccess(supabase: Supabase, examId: string, studentId: string) {
  const [{ data: exam }, windows] = await Promise.all([
    supabase.from("exams").select("status").eq("id", examId).maybeSingle(),
    getStudentExamWindows(supabase, examId, studentId)
  ]);
  return evaluateExamAccess(exam?.status, windows);
}

export function describeExamAccess(access: ExamAccess, formatDateTime: (value: string | null | undefined) => string) {
  if (access.ok) return access.endsAt ? `Hạn chót ${formatDateTime(access.endsAt)}` : "Đang mở";
  if (access.reason === "not_started") return `Mở lúc ${formatDateTime(access.startsAt)}`;
  if (access.reason === "ended") return access.endsAt ? `Đã hết hạn lúc ${formatDateTime(access.endsAt)}` : "Đã hết hạn";
  if (access.reason === "closed") return "Giáo viên đã đóng đề";
  if (access.reason === "not_open") return "Đề chưa mở";
  return "Đề không được giao cho lớp của bạn";
}

type SubmissionTiming = { started_at: string | null };

// Hạn nộp thực tế = mốc sớm hơn giữa (giờ bắt đầu + thời gian làm) và giờ kết thúc giao đề.
export function getSubmissionDeadline(submission: SubmissionTiming, durationMinutes: number | null | undefined, endsAt: string | null) {
  const startedAt = submission.started_at ? new Date(submission.started_at).getTime() : Date.now();
  const deadlines: number[] = [];
  if (Number(durationMinutes ?? 0) > 0) deadlines.push(startedAt + Number(durationMinutes) * 60_000);
  if (endsAt) deadlines.push(new Date(endsAt).getTime());
  return deadlines.length ? Math.min(...deadlines) : null;
}

// Bài đang làm bị khoá khi quá thời gian làm, quá giờ kết thúc giao đề hoặc giáo viên đã đóng đề.
export async function isSubmissionLocked(
  supabase: Supabase,
  submission: SubmissionTiming & { exam_id: string; student_id: string },
  durationMinutes: number | null | undefined
) {
  const access = await getStudentExamAccess(supabase, submission.exam_id, submission.student_id);
  if (!access.ok) return true;
  const deadline = getSubmissionDeadline(submission, durationMinutes, access.endsAt);
  return deadline !== null && Date.now() >= deadline;
}
