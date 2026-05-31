import Link from "next/link";
import { Eye } from "lucide-react";
import { closeExam, deleteExam } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { ScoreBadge } from "@/components/exam/Badges";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime, formatScore } from "@/lib/utils/format";

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const { data: rows } = await supabase
    .from("submissions")
    .select("*, profiles(full_name)")
    .eq("exam_id", id)
    .order("created_at", { ascending: false });

  const submitted = rows?.filter((row) => row.status !== "doing") ?? [];
  const scores = submitted.map((row) => Number(row.final_score));
  const avg = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;

  return (
    <>
      <PageHeader
        title="Kết quả"
        description={exam?.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/teacher/exams/${id}/analysis`}>
              <Button variant="secondary">Phân tích câu sai</Button>
            </Link>
            {exam?.status !== "closed" ? (
              <form action={closeExam.bind(null, id)}>
                <ConfirmSubmitButton variant="secondary" message={`Đóng đề ${exam?.title ?? ""}? Học sinh sẽ không nên tiếp tục làm đề này.`}>Đóng đề</ConfirmSubmitButton>
              </form>
            ) : null}
            <form action={deleteExam.bind(null, id)}>
              <ConfirmSubmitButton message={`Xoá đề ${exam?.title ?? ""}? Toàn bộ câu hỏi, giao đề, bài nộp và file PDF liên quan sẽ bị xoá.`}>Xoá đề</ConfirmSubmitButton>
            </form>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Đã nộp</p>
          <p className="text-2xl font-bold">{submitted.length}/{rows?.length ?? 0}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Trung bình</p>
          <p className="text-2xl font-bold">{formatScore(avg)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Cao nhất</p>
          <p className="text-2xl font-bold">{formatScore(scores.length ? Math.max(...scores) : 0)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Thấp nhất</p>
          <p className="text-2xl font-bold">{formatScore(scores.length ? Math.min(...scores) : 0)}</p>
        </div>
      </div>

      <div className="table-shell">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="p-3">Học sinh</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Điểm</th>
              <th className="p-3">Nộp lúc</th>
              <th className="p-3">Bài làm</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((row: any) => (
              <tr key={row.id} className="border-t">
                <td className="p-3 font-medium">{row.profiles?.full_name ?? "-"}</td>
                <td className="p-3">{formatSubmissionStatus(row.status)}</td>
                <td className="p-3"><ScoreBadge score={row.final_score} /></td>
                <td className="p-3">{formatDateTime(row.submitted_at)}</td>
                <td className="p-3">
                  <Link href={`/teacher/exams/${id}/results/${row.id}`}>
                    <Button variant="secondary" className="h-9 gap-2 px-3">
                      <Eye size={16} />
                      Xem bài làm
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatSubmissionStatus(status: string) {
  if (status === "doing") return "Đang làm";
  if (status === "submitted") return "Đã nộp";
  if (status === "graded") return "Đã chấm";
  return status;
}
