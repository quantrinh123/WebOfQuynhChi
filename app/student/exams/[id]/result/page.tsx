import { PdfViewer } from "@/components/exam/PdfViewer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScoreBadge } from "@/components/exam/Badges";
import { Button } from "@/components/ui/button";
import { retakeExam } from "@/lib/actions/student";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/format";

export default async function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const { data: submission } = await supabase.from("submissions").select("*").eq("exam_id", id).eq("student_id", student.id).single();
  const { data: answerReview } = await supabase
    .from("submission_answers")
    .select("*, exam_questions(question_no, sub_label, question_type, correct_answer, correct_answers_json, topic, order_no)")
    .eq("submission_id", submission?.id)
    .order("exam_questions(order_no)", { ascending: true });
  const { data: signedAnswer } = exam?.show_answer_after_submit && exam.answer_pdf_path
    ? await supabase.storage.from("exam-pdfs").createSignedUrl(exam.answer_pdf_path, 60 * 60)
    : { data: null };
  const retakeAction = retakeExam.bind(null, id);
  return (
    <>
      <PageHeader
        title="Kết quả bài thi"
        description={exam?.title}
        action={
          <form action={retakeAction}>
            <Button variant="secondary">Làm lại đề</Button>
          </form>
        }
      />
      {!exam?.show_score_after_submit ? (
        <div className="surface p-5">Bạn đã nộp bài. Giáo viên chưa công bố điểm.</div>
      ) : (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="surface p-5"><p className="text-sm text-slate-600">Điểm</p><p className="mt-2"><ScoreBadge score={submission?.final_score} /></p></div>
          <div className="surface p-5"><p className="text-sm text-slate-600">Nộp lúc</p><p className="mt-2 font-semibold">{formatDateTime(submission?.submitted_at)}</p></div>
          <div className="surface p-5"><p className="text-sm text-slate-600">Số câu sai</p><p className="mt-2 text-2xl font-bold">{answerReview?.filter((row: any) => row.is_correct === false).length ?? 0}</p></div>
        </div>
      )}
      {exam?.show_score_after_submit ? (
        <div className="table-shell mb-6">
          <div className="border-b p-4">
            <h2 className="font-semibold">Kết quả bài làm</h2>
            <p className="mt-1 text-sm text-slate-600">Đối chiếu bài làm của bạn với đáp án đúng của từng câu.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="p-3">Câu</th>
                  <th className="p-3">Bài làm</th>
                  <th className="p-3">Đáp án đúng</th>
                  <th className="p-3">Kết quả</th>
                  <th className="p-3">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {answerReview?.map((row: any) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-medium">
                      Câu {row.exam_questions.question_no}{row.exam_questions.sub_label ?? ""}
                    </td>
                    <td className="p-3">{formatStudentAnswer(row)}</td>
                    <td className="p-3">{formatCorrectAnswer(row.exam_questions)}</td>
                    <td className="p-3">
                      <span className={row.is_correct ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800"}>
                        {row.is_correct ? "Đúng" : "Sai"}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{Number(row.score ?? 0).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {signedAnswer?.signedUrl ? <PdfViewer fileUrl={signedAnswer.signedUrl} height={640} /> : null}
    </>
  );
}

function formatStudentAnswer(row: any) {
  if (row.selected_option) return row.selected_option;
  if (row.boolean_answer !== null && row.boolean_answer !== undefined) return row.boolean_answer ? "Đúng" : "Sai";
  return row.answer_text || "-";
}

function formatCorrectAnswer(question: any) {
  if (question.question_type === "true_false_item") return question.correct_answer === "true" ? "Đúng" : "Sai";
  if (question.question_type === "short_answer") {
    const answers = Array.isArray(question.correct_answers_json) ? question.correct_answers_json : [];
    return answers.length ? answers.join("; ") : "-";
  }
  return question.correct_answer || "-";
}
