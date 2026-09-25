import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { MathDecor } from "@/components/student/MathDecor";
import { StudentEmpty } from "@/components/student/StudentEmpty";
import { requireStudent } from "@/lib/auth";
import { parseMonth } from "@/lib/schedule";
import { attendanceRate, loadAttendanceSummary } from "@/lib/schedule-data";
import { createServiceClient } from "@/lib/supabase/server";

type SearchParams = { month?: string | string[]; class?: string | string[] };

export default async function StudentSchedulePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const student = await requireStudent();
  const params = (await searchParams) ?? {};
  const month = parseMonth(first(params.month));
  const supabase = createServiceClient();
  const { data: memberships } = await supabase.from("class_students").select("classes(id, name, teacher_id, created_at)").eq("student_id", student.id);
  const classes = (memberships ?? []).map((row: any) => row.classes).filter(Boolean) as Array<{ id: string; name: string; teacher_id: string; created_at: string }>;
  const classFilter = first(params.class);
  const selectedClassId = classes.some((item) => item.id === classFilter) ? classFilter : undefined;
  const attendance = (await loadAttendanceSummary([student.id], classes.map((item) => item.id))).get(student.id);
  const rate = attendanceRate(attendance);

  return (
    <>
      <div className="relative">
        <MathDecor preset="header" variant="pastel" />
        <PageHeader title="Lịch học" description="Lịch học các lớp của bạn." />
      </div>
      {attendance && rate !== null ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className={rate >= 80 ? "rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-100" : "rounded-full bg-rose-50 px-3 py-1.5 font-bold text-rose-700 ring-1 ring-rose-100"}>
            Chuyên cần {rate}%
          </span>
          <span className="text-slate-600">
            Có mặt {attendance.present} · Vắng {attendance.absent} buổi
          </span>
        </div>
      ) : null}
      {!classes.length ? (
        <StudentEmpty title="Bạn chưa thuộc lớp nào" description="Khi giáo viên thêm bạn vào lớp, lịch học sẽ hiện ở đây." />
      ) : (
        <ScheduleView
          role="student"
          studentId={student.id}
          classes={classes}
          selectedClassId={selectedClassId}
          month={month}
          buildHref={({ month: nextMonth, classId }) => {
            const query = new URLSearchParams();
            if (nextMonth) query.set("month", nextMonth);
            if (classId) query.set("class", classId);
            return query.toString() ? `/student/schedule?${query}` : "/student/schedule";
          }}
        />
      )}
    </>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
