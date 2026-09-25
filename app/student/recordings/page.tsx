import { PageHeader } from "@/components/layout/PageHeader";
import { StudentEmpty } from "@/components/student/StudentEmpty";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { RecordingCard } from "@/components/recordings/RecordingCard";
import { MathDecor } from "@/components/student/MathDecor";
import type { ClassRecording } from "@/lib/types";

export default async function StudentRecordingsPage() {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: memberships } = await supabase.from("class_students").select("classes(id, name)").eq("student_id", student.id);
  const classes = (memberships ?? []).map((item: any) => item.classes).filter(Boolean) as Array<{ id: string; name: string }>;
  const { data: recordings } = classes.length
    ? await supabase
        .from("class_recordings")
        .select("*")
        .in("class_id", classes.map((item) => item.id))
        .order("recorded_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    : { data: [] as ClassRecording[] };

  const classesWithRecordings = classes
    .map((classInfo) => ({ ...classInfo, recordings: (recordings ?? []).filter((item) => item.class_id === classInfo.id) }))
    .filter((classInfo) => classInfo.recordings.length);

  return (
    <>
      <div className="relative">
        <MathDecor preset="header" variant="pastel" />
        <PageHeader title="Buổi học" description="Xem lại video record các buổi học của lớp bạn." />
      </div>
      {!classesWithRecordings.length ? <StudentEmpty title="Chưa có link record" description="Giáo viên chưa đăng link record buổi học nào cho lớp của bạn." /> : null}

      <div className="space-y-6">
        {classesWithRecordings.map((classInfo) => (
          <section key={classInfo.id}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950"><span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500" />{classInfo.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {classInfo.recordings.map((recording) => (
                <RecordingCard key={recording.id} recording={recording} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
