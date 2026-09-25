import Link from "next/link";
import { Eye, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBadge } from "@/components/exam/Badges";
import { rankSubmissions } from "@/components/exam/Leaderboard";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatScore } from "@/lib/utils/format";

type ResultsSearchParams = { class?: string | string[] };

export default async function ExamResultsPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<ResultsSearchParams>;
}) {
  await requireTeacher();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const classFilter = (Array.isArray(resolvedSearchParams.class) ? resolvedSearchParams.class[0] : resolvedSearchParams.class) ?? "";
  const supabase = createServiceClient();

  const [{ data: submissions }, { data: assignments }] = await Promise.all([
    supabase.from("submissions").select("*, profiles(full_name)").eq("exam_id", id),
    supabase.from("exam_assignments").select("class_id, classes(id, name)").eq("exam_id", id)
  ]);
  const classes = (assignments ?? []).map((item: any) => item.classes).filter(Boolean) as Array<{ id: string; name: string }>;
  const classIds = classFilter ? [classFilter] : classes.map((item) => item.id);
  const { data: roster } = classIds.length
    ? await supabase.from("class_students").select("class_id, student_id, profiles(full_name)").in("class_id", classIds)
    : { data: [] as any[] };

  const rosterIds = new Set((roster ?? []).map((row: any) => row.student_id));
  const visibleSubmissions = (submissions ?? []).filter((row) => !classFilter || rosterIds.has(row.student_id));
  const ranking = rankSubmissions(visibleSubmissions);
  const rankById = new Map(ranking.map((row) => [row.id, row.rank]));
  const submittedIds = new Set(visibleSubmissions.map((row) => row.student_id));

  const notStarted = new Map<string, string>();
  (roster ?? []).forEach((row: any) => {
    if (!submittedIds.has(row.student_id)) notStarted.set(row.student_id, row.profiles?.full_name ?? "-");
  });

  const done = visibleSubmissions.filter((row) => row.status !== "doing");
  const doing = visibleSubmissions.filter((row) => row.status === "doing");
  const scores = done.map((row) => Number(row.final_score));
  const avg = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const totalStudents = new Set([...rosterIds, ...visibleSubmissions.map((row) => row.student_id)]).size;

  const orderedDone = [...done].sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));

  return (
    <>
      {classes.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip href={`/teacher/exams/${id}/results`} active={!classFilter} label="Tất cả lớp" />
          {classes.map((classInfo) => (
            <FilterChip key={classInfo.id} href={`/teacher/exams/${id}/results?class=${classInfo.id}`} active={classFilter === classInfo.id} label={classInfo.name} />
          ))}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Đã nộp" value={`${done.length}/${totalStudents}`} />
        <Stat label="Đang làm / Chưa làm" value={`${doing.length} / ${notStarted.size}`} />
        <Stat label="Trung bình" value={formatScore(avg)} />
        <Stat label="Cao nhất" value={formatScore(scores.length ? Math.max(...scores) : 0)} />
        <Stat label="Thấp nhất" value={formatScore(scores.length ? Math.min(...scores) : 0)} />
      </div>

      {!totalStudents ? (
        <EmptyState title="Chưa có học sinh" description="Đề chưa được giao cho lớp nào hoặc lớp chưa có học sinh." />
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="p-3">Hạng</th>
                  <th className="p-3">Học sinh</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Điểm</th>
                  <th className="p-3">Nộp lúc</th>
                  <th className="p-3">Bài làm</th>
                </tr>
              </thead>
              <tbody>
                {orderedDone.map((row: any) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-bold"><RankCell rank={rankById.get(row.id)} /></td>
                    <td className="p-3 font-medium"><StudentLink id={row.student_id} name={row.profiles?.full_name} /></td>
                    <td className="p-3"><StatusPill status={row.status} /></td>
                    <td className="p-3"><ScoreBadge score={row.final_score} /></td>
                    <td className="p-3">{formatDateTime(row.submitted_at)}</td>
                    <td className="p-3">
                      <Link href={`/teacher/exams/${id}/results/${row.id}`}>
                        <Button variant="secondary" className="h-9 gap-2 px-3">
                          <Eye size={16} />
                          Xem & phân tích
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {doing.map((row: any) => (
                  <tr key={row.id} className="border-t bg-sky-50/40">
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 font-medium"><StudentLink id={row.student_id} name={row.profiles?.full_name} /></td>
                    <td className="p-3"><StatusPill status="doing" /></td>
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 text-slate-500">Bắt đầu {formatDateTime(row.started_at)}</td>
                    <td className="p-3" />
                  </tr>
                ))}
                {Array.from(notStarted.entries()).map(([studentId, name]) => (
                  <tr key={studentId} className="border-t bg-slate-50/60">
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 font-medium"><StudentLink id={studentId} name={name} /></td>
                    <td className="p-3"><StatusPill status="not_started" /></td>
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-bold transition",
        active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      )}
    >
      {label}
    </Link>
  );
}

function RankCell({ rank }: { rank?: number }) {
  if (!rank) return <>-</>;
  const color = rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-600" : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {color ? <Medal size={16} className={color} /> : null}
      {rank}
    </span>
  );
}

function StudentLink({ id, name }: { id: string; name?: string | null }) {
  return (
    <Link href={`/teacher/students/${id}`} className="text-teal-700 hover:underline">
      {name ?? "-"}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    graded: { label: "Đã nộp", className: "bg-emerald-100 text-emerald-800" },
    submitted: { label: "Đã nộp", className: "bg-emerald-100 text-emerald-800" },
    doing: { label: "Đang làm", className: "bg-sky-100 text-sky-800" },
    not_started: { label: "Chưa làm", className: "bg-slate-200 text-slate-700" }
  };
  const item = map[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", item.className)}>{item.label}</span>;
}
