import { APP_TIME_ZONE } from "@/lib/utils/format";

// Mọi ngày dùng chuỗi "YYYY-MM-DD" và giờ "HH:MM" theo giờ Việt Nam.

export type ScheduleRow = {
  id: string;
  class_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  mode: "online" | "offline";
  meeting_url: string | null;
  location: string | null;
  starts_on: string;
  ends_on: string | null;
};

export type SessionRow = {
  id: string;
  class_id: string;
  schedule_id: string | null;
  original_date: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "cancelled";
  title: string | null;
  note: string | null;
  mode: "online" | "offline";
  meeting_url: string | null;
  location: string | null;
};

export type HolidayRow = { id: string; holiday_date: string; name: string };

export type Occurrence = {
  key: string;
  classId: string;
  date: string;
  start: string;
  end: string;
  status: "scheduled" | "cancelled";
  title: string | null;
  note: string | null;
  mode: "online" | "offline";
  meetingUrl: string | null;
  location: string | null;
  scheduleId: string | null;
  sessionId: string | null;
  originalDate: string | null;
};

export const WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
export const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Màu theo lớp (thứ tự cố định theo ngày tạo lớp, không đổi khi lọc).
export const CLASS_COLORS = [
  { pill: "bg-rose-100 text-rose-700 hover:bg-rose-200", dot: "bg-rose-500", soft: "bg-rose-50 hover:bg-rose-100", bar: "border-l-rose-500", text: "text-rose-700" },
  { pill: "bg-violet-100 text-violet-700 hover:bg-violet-200", dot: "bg-violet-500", soft: "bg-violet-50 hover:bg-violet-100", bar: "border-l-violet-500", text: "text-violet-700" },
  { pill: "bg-sky-100 text-sky-700 hover:bg-sky-200", dot: "bg-sky-500", soft: "bg-sky-50 hover:bg-sky-100", bar: "border-l-sky-500", text: "text-sky-700" },
  { pill: "bg-amber-100 text-amber-800 hover:bg-amber-200", dot: "bg-amber-500", soft: "bg-amber-50 hover:bg-amber-100", bar: "border-l-amber-500", text: "text-amber-800" },
  { pill: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", dot: "bg-emerald-500", soft: "bg-emerald-50 hover:bg-emerald-100", bar: "border-l-emerald-500", text: "text-emerald-700" },
  { pill: "bg-pink-100 text-pink-700 hover:bg-pink-200", dot: "bg-pink-500", soft: "bg-pink-50 hover:bg-pink-100", bar: "border-l-pink-500", text: "text-pink-700" },
  { pill: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200", dot: "bg-indigo-500", soft: "bg-indigo-50 hover:bg-indigo-100", bar: "border-l-indigo-500", text: "text-indigo-700" },
  { pill: "bg-teal-100 text-teal-700 hover:bg-teal-200", dot: "bg-teal-500", soft: "bg-teal-50 hover:bg-teal-100", bar: "border-l-teal-500", text: "text-teal-700" }
];

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function todayVN(now = Date.now()) {
  return dayFormatter.format(new Date(now));
}

export function toVNDate(iso: string) {
  return dayFormatter.format(new Date(iso));
}

export function toVNTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// 1 = Thứ 2 ... 7 = Chủ nhật
export function weekdayOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function shortTime(value: string) {
  return value.slice(0, 5);
}

export function occurrenceStart(occurrence: Pick<Occurrence, "date" | "start">) {
  return new Date(`${occurrence.date}T${shortTime(occurrence.start)}:00+07:00`).getTime();
}

export function occurrenceEnd(occurrence: Pick<Occurrence, "date" | "end">) {
  return new Date(`${occurrence.date}T${shortTime(occurrence.end)}:00+07:00`).getTime();
}

// "2026-09" -> các ngày hiển thị trên lưới tháng (bắt đầu Thứ 2, đủ tuần).
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const [year, monthIndex] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthIndex, 0)).toISOString().slice(0, 10);
  const gridStart = addDays(first, -(weekdayOf(first) - 1));
  const gridEnd = addDays(last, 7 - weekdayOf(last));
  const days: string[] = [];
  for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) days.push(date);
  return { first, last, gridStart, gridEnd, days };
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const value = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return value.toISOString().slice(0, 7);
}

export function parseMonth(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : todayVN().slice(0, 7);
}

export function formatMonthTitle(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return `Tháng ${monthIndex}, ${year}`;
}

// Sinh các buổi học trong khoảng [from, to] từ lịch cố định + buổi đã sửa / học thêm.
// Buổi theo lịch cố định rơi vào ngày nghỉ sẽ bị bỏ qua (trừ khi giáo viên đã sửa riêng buổi đó).
export function expandOccurrences(input: { schedules: ScheduleRow[]; sessions: SessionRow[]; holidays: HolidayRow[]; from: string; to: string }): Occurrence[] {
  const holidayDates = new Set(input.holidays.map((holiday) => holiday.holiday_date));
  const overridden = new Set(input.sessions.filter((session) => session.schedule_id && session.original_date).map((session) => `${session.schedule_id}:${session.original_date}`));
  const result: Occurrence[] = [];

  for (const schedule of input.schedules) {
    const start = schedule.starts_on > input.from ? schedule.starts_on : input.from;
    const end = schedule.ends_on && schedule.ends_on < input.to ? schedule.ends_on : input.to;
    if (start > end) continue;
    let date = addDays(start, (schedule.weekday - weekdayOf(start) + 7) % 7);
    for (; date <= end; date = addDays(date, 7)) {
      if (overridden.has(`${schedule.id}:${date}`) || holidayDates.has(date)) continue;
      result.push({
        key: `${schedule.id}:${date}`,
        classId: schedule.class_id,
        date,
        start: shortTime(schedule.start_time),
        end: shortTime(schedule.end_time),
        status: "scheduled",
        title: null,
        note: null,
        mode: schedule.mode,
        meetingUrl: schedule.meeting_url,
        location: schedule.location,
        scheduleId: schedule.id,
        sessionId: null,
        originalDate: date
      });
    }
  }

  for (const session of input.sessions) {
    if (session.session_date < input.from || session.session_date > input.to) continue;
    result.push({
      key: session.id,
      classId: session.class_id,
      date: session.session_date,
      start: shortTime(session.start_time),
      end: shortTime(session.end_time),
      status: session.status,
      title: session.title,
      note: session.note,
      mode: session.mode,
      meetingUrl: session.meeting_url,
      location: session.location,
      scheduleId: session.schedule_id,
      sessionId: session.id,
      originalDate: session.original_date
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
