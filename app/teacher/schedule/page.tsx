import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireTeacher } from "@/lib/auth";
import { getCalendarFeed } from "@/lib/calendar-token";
import { parseMonth } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/server";

type SearchParams = { month?: string | string[]; class?: string | string[] };

export default async function TeacherSchedulePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const teacher = await requireTeacher();
  const params = (await searchParams) ?? {};
  const month = parseMonth(first(params.month));
  const supabase = createServiceClient();
  const { data: classes } = await supabase.from("classes").select("id, name, teacher_id, created_at").eq("teacher_id", teacher.id);
  const classFilter = first(params.class);
  const selectedClassId = classes?.some((item) => item.id === classFilter) ? classFilter : undefined;
  const feed = await getCalendarFeed(teacher.id);

  return (
    <>
      <PageHeader title="Lịch học" description="Lịch dạy của các lớp. Học sinh trong lớp nào sẽ thấy lịch của lớp đó." />
      {!classes?.length ? (
        <EmptyState title="Chưa có lớp nào" description="Tạo lớp ở mục Lớp học, sau đó quay lại đây để xếp lịch." />
      ) : (
        <ScheduleView
          role="teacher"
          feed={feed}
          classes={classes}
          selectedClassId={selectedClassId}
          month={month}
          buildHref={({ month: nextMonth, classId }) => buildHref("/teacher/schedule", nextMonth, classId)}
        />
      )}
    </>
  );
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(base: string, month?: string, classId?: string) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (classId) params.set("class", classId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
