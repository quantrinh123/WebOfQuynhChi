import { PageHeader } from "@/components/layout/PageHeader";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function ExamAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", id).neq("question_type", "true_false_group").order("order_no");
  const { data: answers } = await supabase.from("submission_answers").select("*, exam_questions!inner(exam_id, question_no, sub_label, topic)").eq("exam_questions.exam_id", id);
  const rows = (questions ?? []).map((question) => {
    const related = (answers ?? []).filter((answer: any) => answer.question_id === question.id);
    const wrong = related.filter((answer: any) => answer.is_correct === false).length;
    const total = related.length;
    return { question, wrong, total, rate: total ? Math.round((wrong / total) * 100) : 0 };
  }).sort((a, b) => b.wrong - a.wrong);
  return (
    <>
      <PageHeader title="Phân tích câu sai" description="Xếp theo số lượt sai nhiều nhất" />
      <div className="table-shell">
        <table className="w-full text-left text-sm">
          <thead className="table-head"><tr><th className="p-3">Câu</th><th className="p-3">Chủ đề</th><th className="p-3">Sai</th><th className="p-3">Tỉ lệ sai</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.question.id} className="border-t"><td className="p-3 font-medium">{row.question.question_no}{row.question.sub_label ? row.question.sub_label : ""}</td><td className="p-3">{row.question.topic || "-"}</td><td className="p-3">{row.wrong}/{row.total}</td><td className="p-3">{row.rate}%</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
