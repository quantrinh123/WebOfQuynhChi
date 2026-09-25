import { EmptyState } from "@/components/ui/EmptyState";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/format";

export default async function ExamAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", id).neq("question_type", "true_false_group").order("order_no");
  const { data: answers } = await supabase
    .from("submission_answers")
    .select("question_id, is_correct, submissions!inner(status)")
    .in("question_id", (questions ?? []).map((question) => question.id))
    .neq("submissions.status", "doing");

  const rows = (questions ?? [])
    .map((question) => {
      const related = (answers ?? []).filter((answer: any) => answer.question_id === question.id);
      const wrong = related.filter((answer: any) => answer.is_correct === false).length;
      const total = related.length;
      return { question, wrong, total, rate: total ? Math.round((wrong / total) * 100) : 0 };
    })
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong);

  if (!rows.some((row) => row.total)) {
    return <EmptyState title="Chưa có dữ liệu" description="Khi học sinh nộp bài, các câu sai nhiều nhất sẽ hiện ở đây." />;
  }

  return (
    <div className="table-shell">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-semibold">Câu sai nhiều nhất</h2>
        <p className="mt-1 text-sm text-slate-600">Xếp theo tỉ lệ sai trên số bài đã nộp có trả lời câu đó.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="p-3">Câu</th>
              <th className="p-3">Chủ đề</th>
              <th className="p-3">Sai</th>
              <th className="p-3 w-1/3">Tỉ lệ sai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.question.id} className="border-t">
                <td className="p-3 font-medium">Câu {row.question.question_no}{row.question.sub_label ?? ""}</td>
                <td className="p-3">{row.question.topic || "-"}</td>
                <td className="p-3">{row.wrong}/{row.total}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full", row.rate >= 50 ? "bg-rose-500" : row.rate >= 20 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${row.rate}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-semibold">{row.rate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
