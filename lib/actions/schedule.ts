"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorMessage, failure, success, type ActionResult } from "@/lib/actions/result";

type Supabase = ReturnType<typeof createServiceClient>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// Lịch cố định: một dòng cho mỗi thứ được chọn.
export async function saveClassSchedule(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    const classId = String(formData.get("class_id") ?? "");
    await assertOwnsClass(supabase, classId, teacher.id);
    const weekdays = formData.getAll("weekdays").map(Number).filter((day) => day >= 1 && day <= 7);
    if (!weekdays.length) return failure("Hãy chọn ít nhất một thứ trong tuần.");
    const times = readTimes(formData);
    if (!times.ok) return failure(times.message);
    const place = readPlace(formData);
    const startsOn = readDate(formData.get("starts_on"));
    if (!startsOn) return failure("Hãy chọn ngày bắt đầu áp dụng.");
    const endsOn = readDate(formData.get("ends_on"));
    if (endsOn && endsOn < startsOn) return failure("Ngày kết thúc phải sau ngày bắt đầu.");

    const { error } = await supabase.from("class_schedules").insert(
      weekdays.map((weekday) => ({ class_id: classId, weekday, start_time: times.start, end_time: times.end, ...place, starts_on: startsOn, ends_on: endsOn }))
    );
    if (error) return failure("Không lưu được lịch. Bạn đã chạy migration 002_class_schedules chưa?");
    revalidateSchedule(classId);
    return success(`Đã xếp lịch ${weekdays.length} buổi mỗi tuần.`);
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function deleteClassSchedule(scheduleId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: schedule } = await supabase.from("class_schedules").select("class_id").eq("id", scheduleId).maybeSingle();
  if (!schedule) return;
  await assertOwnsClass(supabase, schedule.class_id, teacher.id);
  await supabase.from("class_schedules").delete().eq("id", scheduleId);
  revalidateSchedule(schedule.class_id);
}

// Thêm buổi học riêng, hoặc sửa một buổi (buổi học thêm hoặc buổi của lịch cố định).
export async function saveSession(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    const classId = String(formData.get("class_id") ?? "");
    await assertOwnsClass(supabase, classId, teacher.id);
    const sessionDate = readDate(formData.get("session_date"));
    if (!sessionDate) return failure("Hãy chọn ngày học.");
    const times = readTimes(formData);
    if (!times.ok) return failure(times.message);
    const values = {
      class_id: classId,
      session_date: sessionDate,
      start_time: times.start,
      end_time: times.end,
      title: String(formData.get("title") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
      status: formData.get("status") === "cancelled" ? "cancelled" : "scheduled",
      ...readPlace(formData)
    };

    const sessionId = String(formData.get("session_id") ?? "");
    const scheduleId = String(formData.get("schedule_id") ?? "");
    const originalDate = readDate(formData.get("original_date"));
    let error;
    if (sessionId) {
      ({ error } = await supabase.from("class_sessions").update(values).eq("id", sessionId).eq("class_id", classId));
    } else if (scheduleId && originalDate) {
      const { data: schedule } = await supabase.from("class_schedules").select("id").eq("id", scheduleId).eq("class_id", classId).maybeSingle();
      if (!schedule) return failure("Không tìm thấy lịch.");
      ({ error } = await supabase
        .from("class_sessions")
        .upsert({ ...values, schedule_id: scheduleId, original_date: originalDate }, { onConflict: "schedule_id,original_date" }));
    } else {
      ({ error } = await supabase.from("class_sessions").insert(values));
    }
    if (error) return failure("Không lưu được buổi học. Bạn đã chạy migration 002_class_schedules chưa?");
    revalidateSchedule(classId);
    return success(sessionId || scheduleId ? "Đã cập nhật buổi học." : "Đã thêm buổi học.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

// Huỷ / khôi phục một buổi. Buổi của lịch cố định chưa sửa thì tạo bản ghi sửa riêng.
export async function setSessionStatus(
  target: { classId: string; sessionId: string | null; scheduleId: string | null; originalDate: string | null; date: string; start: string; end: string },
  status: "scheduled" | "cancelled",
  _state: ActionResult,
  _formData: FormData
): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    await assertOwnsClass(supabase, target.classId, teacher.id);
    if (target.sessionId) {
      await supabase.from("class_sessions").update({ status }).eq("id", target.sessionId).eq("class_id", target.classId);
    } else if (target.scheduleId && target.originalDate) {
      const { data: schedule } = await supabase.from("class_schedules").select("*").eq("id", target.scheduleId).eq("class_id", target.classId).maybeSingle();
      if (!schedule) return failure("Không tìm thấy lịch.");
      await supabase.from("class_sessions").upsert(
        {
          class_id: target.classId,
          schedule_id: target.scheduleId,
          original_date: target.originalDate,
          session_date: target.date,
          start_time: target.start,
          end_time: target.end,
          mode: schedule.mode,
          meeting_url: schedule.meeting_url,
          location: schedule.location,
          status
        },
        { onConflict: "schedule_id,original_date" }
      );
    }
    revalidateSchedule(target.classId);
    return success(status === "cancelled" ? "Đã huỷ buổi học." : "Đã khôi phục buổi học.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

// Xoá buổi học thêm, hoặc bỏ phần sửa riêng để buổi quay về theo lịch cố định.
export async function deleteSession(classId: string, sessionId: string, _state: ActionResult, _formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    await assertOwnsClass(supabase, classId, teacher.id);
    await supabase.from("class_sessions").delete().eq("id", sessionId).eq("class_id", classId);
    revalidateSchedule(classId);
    return success("Đã xoá.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

// Điểm danh một buổi: mỗi học sinh Có mặt hoặc Vắng (mặc định Có mặt).
export async function saveAttendance(
  target: { classId: string; sessionId: string | null; scheduleId: string | null; originalDate: string | null; date: string; start: string; end: string },
  _state: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    await assertOwnsClass(supabase, target.classId, teacher.id);
    if (Date.now() < new Date(`${target.date}T${target.start}:00+07:00`).getTime()) {
      return failure("Chỉ điểm danh được từ lúc buổi học bắt đầu.");
    }

    let sessionId = target.sessionId;
    if (sessionId) {
      const { data: session } = await supabase.from("class_sessions").select("id, status").eq("id", sessionId).eq("class_id", target.classId).maybeSingle();
      if (!session) return failure("Không tìm thấy buổi học.");
      if (session.status === "cancelled") return failure("Buổi học đã bị huỷ.");
    } else {
      // Buổi theo lịch cố định: lưu thành một dòng riêng để gắn điểm danh.
      if (!target.scheduleId || !target.originalDate) return failure("Không tìm thấy buổi học.");
      const { data: schedule } = await supabase.from("class_schedules").select("*").eq("id", target.scheduleId).eq("class_id", target.classId).maybeSingle();
      if (!schedule) return failure("Không tìm thấy lịch.");
      const { data: created, error } = await supabase
        .from("class_sessions")
        .upsert(
          {
            class_id: target.classId,
            schedule_id: target.scheduleId,
            original_date: target.originalDate,
            session_date: target.date,
            start_time: target.start,
            end_time: target.end,
            mode: schedule.mode,
            meeting_url: schedule.meeting_url,
            location: schedule.location,
            status: "scheduled"
          },
          { onConflict: "schedule_id,original_date" }
        )
        .select("id")
        .single();
      if (error || !created) return failure("Không lưu được buổi học.");
      sessionId = created.id;
    }

    const { data: roster } = await supabase.from("class_students").select("student_id").eq("class_id", target.classId);
    const rows = (roster ?? []).map((row) => ({
      session_id: sessionId!,
      student_id: row.student_id,
      status: formData.get(`status_${row.student_id}`) === "absent" ? "absent" : "present",
      updated_at: new Date().toISOString()
    }));
    if (!rows.length) return failure("Lớp chưa có học sinh.");
    const { error } = await supabase.from("session_attendance").upsert(rows, { onConflict: "session_id,student_id" });
    if (error) return failure("Không lưu được điểm danh. Bạn đã chạy migration 003_attendance chưa?");

    const absent = rows.filter((row) => row.status === "absent").length;
    revalidateSchedule(target.classId);
    revalidatePath("/teacher/dashboard");
    return success(`Đã điểm danh: ${rows.length - absent} có mặt, ${absent} vắng.`);
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function addHoliday(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const from = readDate(formData.get("from"));
    const to = readDate(formData.get("to")) ?? from;
    const name = String(formData.get("name") ?? "").trim();
    if (!from || !to) return failure("Hãy chọn ngày nghỉ.");
    if (!name) return failure("Hãy nhập tên ngày nghỉ, VD: Quốc khánh.");
    if (to < from) return failure("Ngày kết thúc phải sau ngày bắt đầu.");
    const rows = [];
    for (let date = from; date <= to && rows.length < 60; date = nextDay(date)) rows.push({ teacher_id: teacher.id, holiday_date: date, name });
    const supabase = createServiceClient();
    const { error } = await supabase.from("teacher_holidays").upsert(rows, { onConflict: "teacher_id,holiday_date" });
    if (error) return failure("Không lưu được ngày nghỉ. Bạn đã chạy migration 002_class_schedules chưa?");
    revalidatePath("/teacher/schedule");
    revalidatePath("/student/schedule");
    return success(rows.length > 1 ? `Đã thêm ${rows.length} ngày nghỉ.` : "Đã thêm ngày nghỉ.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function deleteHoliday(holidayId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await supabase.from("teacher_holidays").delete().eq("id", holidayId).eq("teacher_id", teacher.id);
  revalidatePath("/teacher/schedule");
  revalidatePath("/student/schedule");
}

// ---------- Hàm nội bộ ----------

function readDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return DATE.test(text) ? text : null;
}

function readTimes(formData: FormData) {
  const start = String(formData.get("start_time") ?? "").slice(0, 5);
  const end = String(formData.get("end_time") ?? "").slice(0, 5);
  if (!TIME.test(start) || !TIME.test(end)) return { ok: false as const, message: "Hãy nhập giờ bắt đầu và kết thúc." };
  if (end <= start) return { ok: false as const, message: "Giờ kết thúc phải sau giờ bắt đầu." };
  return { ok: true as const, start, end };
}

function readPlace(formData: FormData) {
  const mode = formData.get("mode") === "offline" ? "offline" : "online";
  const meetingUrl = String(formData.get("meeting_url") ?? "").trim();
  return {
    mode,
    meeting_url: mode === "online" && /^https?:\/\//i.test(meetingUrl) ? meetingUrl : null,
    location: String(formData.get("location") ?? "").trim() || null
  };
}

function nextDay(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function revalidateSchedule(classId: string) {
  revalidatePath("/teacher/schedule");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/student/schedule");
  revalidatePath("/student/exams");
}

async function assertOwnsClass(supabase: Supabase, classId: string, teacherId: string) {
  const { data } = await supabase.from("classes").select("id").eq("id", classId).eq("teacher_id", teacherId).maybeSingle();
  if (!data) throw new Error("Không tìm thấy lớp học.");
}
