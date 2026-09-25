import { createServiceClient } from "@/lib/supabase/server";
import { expandOccurrences, type HolidayRow, type Occurrence, type ScheduleRow, type SessionRow } from "@/lib/schedule";

export type CalendarClass = { id: string; name: string; colorIndex: number };
export type AttendanceStatus = "present" | "absent";
export type RosterStudent = { id: string; name: string };

export type CalendarEvent = {
  kind: "session";
  id: string;
  date: string;
  sortTime: string;
  occurrence: Occurrence;
  className: string;
  colorIndex: number;
  recordingUrl: string | null;
  // Giáo viên: kết quả điểm danh của cả lớp (studentId -> trạng thái). Học sinh: chỉ trạng thái của mình.
  attendance: Record<string, AttendanceStatus> | null;
  myAttendance: AttendanceStatus | null;
};

export type CalendarViewer = { role: "teacher" } | { role: "student"; studentId: string };

// Tải toàn bộ dữ liệu cần cho lịch trong khoảng ngày [from, to].
export async function loadCalendar(input: {
  classes: Array<{ id: string; name: string; teacher_id: string; created_at: string }>;
  from: string;
  to: string;
  viewer?: CalendarViewer;
}) {
  const supabase = createServiceClient();
  // Màu theo thứ tự tạo lớp để không đổi khi lọc.
  const ordered = [...input.classes].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const classes: CalendarClass[] = ordered.map((item, index) => ({ id: item.id, name: item.name, colorIndex: index }));
  const classIds = classes.map((item) => item.id);
  const teacherIds = Array.from(new Set(input.classes.map((item) => item.teacher_id)));
  const empty = { classes, events: [] as CalendarEvent[], holidays: [] as HolidayRow[], schedules: [] as ScheduleRow[], rosters: {} as Record<string, RosterStudent[]> };
  if (!classIds.length) return empty;

  const isTeacher = input.viewer?.role === "teacher";
  const [schedulesResult, sessionsResult, holidaysResult, recordingsResult, rosterResult] = await Promise.all([
    supabase.from("class_schedules").select("*").in("class_id", classIds),
    supabase
      .from("class_sessions")
      .select("*")
      .in("class_id", classIds)
      .or(`and(session_date.gte.${input.from},session_date.lte.${input.to}),and(original_date.gte.${input.from},original_date.lte.${input.to})`),
    supabase.from("teacher_holidays").select("id, holiday_date, name").in("teacher_id", teacherIds).gte("holiday_date", input.from).lte("holiday_date", input.to),
    supabase.from("class_recordings").select("class_id, url, recorded_at").in("class_id", classIds).gte("recorded_at", input.from).lte("recorded_at", input.to),
    isTeacher ? supabase.from("class_students").select("class_id, student_id, profiles(full_name)").in("class_id", classIds) : Promise.resolve({ data: [] as any[] })
  ]);

  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const sessionIds = sessions.map((session) => session.id);
  let attendanceQuery = sessionIds.length ? supabase.from("session_attendance").select("session_id, student_id, status").in("session_id", sessionIds) : null;
  if (attendanceQuery && input.viewer?.role === "student") attendanceQuery = attendanceQuery.eq("student_id", input.viewer.studentId);
  const { data: attendanceRows } = attendanceQuery ? await attendanceQuery : { data: [] as Array<{ session_id: string; student_id: string; status: AttendanceStatus }> };

  const attendanceBySession = new Map<string, Record<string, AttendanceStatus>>();
  (attendanceRows ?? []).forEach((row) => {
    const record = attendanceBySession.get(row.session_id) ?? {};
    record[row.student_id] = row.status as AttendanceStatus;
    attendanceBySession.set(row.session_id, record);
  });

  const rosters: Record<string, RosterStudent[]> = {};
  (rosterResult.data ?? []).forEach((row: any) => {
    (rosters[row.class_id] ??= []).push({ id: row.student_id, name: row.profiles?.full_name ?? "Học sinh" });
  });
  Object.values(rosters).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, "vi")));

  const schedules = (schedulesResult.data ?? []) as ScheduleRow[];
  const holidays = (holidaysResult.data ?? []) as HolidayRow[];
  const occurrences = expandOccurrences({ schedules, sessions, holidays, from: input.from, to: input.to });
  const classById = new Map(classes.map((item) => [item.id, item]));
  const recordingByKey = new Map((recordingsResult.data ?? []).map((row: any) => [`${row.class_id}:${row.recorded_at}`, row.url as string]));

  const events: CalendarEvent[] = occurrences
    .filter((occurrence) => classById.has(occurrence.classId))
    .map((occurrence) => {
      const classInfo = classById.get(occurrence.classId)!;
      const record = occurrence.sessionId ? attendanceBySession.get(occurrence.sessionId) ?? null : null;
      return {
        kind: "session" as const,
        id: occurrence.key,
        date: occurrence.date,
        sortTime: occurrence.start,
        occurrence,
        className: classInfo.name,
        colorIndex: classInfo.colorIndex,
        recordingUrl: recordingByKey.get(`${occurrence.classId}:${occurrence.date}`) ?? null,
        attendance: isTeacher ? record : null,
        myAttendance: input.viewer?.role === "student" && record ? record[input.viewer.studentId] ?? null : null
      };
    });

  return { classes, schedules, holidays, events, rosters };
}

export type AttendanceSummary = {
  present: number;
  absent: number;
  absences: Array<{ date: string; classId: string }>;
  // Mới nhất trước.
  records: Array<{ date: string; status: AttendanceStatus }>;
};

// Tổng hợp chuyên cần của học sinh (chỉ tính các buổi đã điểm danh).
export async function loadAttendanceSummary(studentIds: string[], classIds: string[]) {
  const supabase = createServiceClient();
  const summary = new Map<string, AttendanceSummary>();
  if (!studentIds.length || !classIds.length) return summary;
  const { data } = await supabase
    .from("session_attendance")
    .select("student_id, status, class_sessions!inner(class_id, session_date)")
    .in("student_id", studentIds)
    .in("class_sessions.class_id", classIds);
  (data ?? []).forEach((row: any) => {
    const item = summary.get(row.student_id) ?? { present: 0, absent: 0, absences: [], records: [] };
    item.records.push({ date: row.class_sessions.session_date, status: row.status });
    if (row.status === "present") item.present += 1;
    else {
      item.absent += 1;
      item.absences.push({ date: row.class_sessions.session_date, classId: row.class_sessions.class_id });
    }
    summary.set(row.student_id, item);
  });
  summary.forEach((item) => {
    item.absences.sort((a, b) => b.date.localeCompare(a.date));
    item.records.sort((a, b) => b.date.localeCompare(a.date));
  });
  return summary;
}

export function attendanceRate(item: { present: number; absent: number } | undefined) {
  const total = item ? item.present + item.absent : 0;
  return item && total ? Math.round((item.present / total) * 100) : null;
}
