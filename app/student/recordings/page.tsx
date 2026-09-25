import { CalendarDays, ExternalLink, Video } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
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
      <PageHeader title="Buổi học" description="Xem lại video record các buổi học của lớp bạn." />
      {!classesWithRecordings.length ? <EmptyState title="Chưa có link record" description="Giáo viên chưa đăng link record buổi học nào cho lớp của bạn." /> : null}

      <div className="space-y-6">
        {classesWithRecordings.map((classInfo) => (
          <section key={classInfo.id}>
            <h2 className="mb-3 text-lg font-bold text-slate-950">{classInfo.name}</h2>
            <div className="grid gap-3">
              {classInfo.recordings.map((recording) => (
                <article key={recording.id} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <Video size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-950">{recording.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                        <CalendarDays size={15} />
                        {formatDate(recording.recorded_at ?? recording.created_at)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800"
                  >
                    <ExternalLink size={16} />
                    Xem record
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
