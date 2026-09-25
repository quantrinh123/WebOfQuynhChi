import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import type { CalendarFeed } from "@/components/schedule/GoogleCalendarSync";
import { formatMonthTitle, monthGrid, shiftMonth, todayVN } from "@/lib/schedule";
import { loadCalendar } from "@/lib/schedule-data";

type ClassInput = { id: string; name: string; teacher_id: string; created_at: string };

// Lịch tháng: tải dữ liệu phía server rồi giao cho ScheduleBoard hiển thị.
export async function ScheduleView({
  role,
  classes,
  selectedClassId,
  month,
  buildHref,
  showClassFilter = true,
  studentId,
  feed
}: {
  role: "teacher" | "student";
  classes: ClassInput[];
  selectedClassId?: string;
  month: string;
  buildHref: (params: { month?: string; classId?: string }) => string;
  showClassFilter?: boolean;
  studentId?: string;
  feed?: CalendarFeed;
}) {
  const grid = monthGrid(month);
  const filtered = selectedClassId ? classes.filter((item) => item.id === selectedClassId) : classes;
  // Tải theo toàn bộ lớp để màu mỗi lớp không đổi khi lọc, rồi mới lọc sự kiện.
  const calendar = await loadCalendar({ classes, from: grid.gridStart, to: grid.gridEnd, viewer: role === "student" && studentId ? { role: "student", studentId } : { role: "teacher" } });
  const filteredIds = new Set(filtered.map((item) => item.id));
  const events = calendar.events.filter((event) => filteredIds.has(event.occurrence.classId));
  const monthSessions = events.filter((event) => event.date.startsWith(month) && event.occurrence.status === "scheduled");
  const activeClasses = new Set(monthSessions.map((event) => event.occurrence.classId));

  const filterOptions = showClassFilter
    ? [
        { label: `Tất cả lớp (${classes.length})`, href: buildHref({ month }), active: !selectedClassId },
        ...[...calendar.classes].map((item) => ({ label: item.name, href: buildHref({ month, classId: item.id }), active: item.id === selectedClassId }))
      ]
    : [];

  return (
    <ScheduleBoard
      role={role}
      month={month}
      monthTitle={formatMonthTitle(month)}
      prevHref={buildHref({ month: shiftMonth(month, -1), classId: selectedClassId })}
      nextHref={buildHref({ month: shiftMonth(month, 1), classId: selectedClassId })}
      todayHref={buildHref({ classId: selectedClassId })}
      filterOptions={filterOptions}
      days={grid.days}
      today={todayVN()}
      events={events}
      holidays={calendar.holidays}
      classes={calendar.classes.filter((item) => filteredIds.has(item.id))}
      schedules={role === "teacher" ? calendar.schedules : []}
      rosters={role === "teacher" ? calendar.rosters : {}}
      feed={feed}
      summary={{ sessions: monthSessions.length, classes: activeClasses.size }}
    />
  );
}
