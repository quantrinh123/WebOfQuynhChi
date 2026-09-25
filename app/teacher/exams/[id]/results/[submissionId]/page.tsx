import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/exam/Badges";
import { rankSubmissions } from "@/components/exam/Leaderboard";
import { SectionBreakdown, TopicBreakdown } from "@/components/exam/StudentAnalysis";
import { analyzeSubmission } from "@/lib/analysis";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime, formatScore } from "@/lib/utils/format";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const teacher = await requireTeacher();
  const { id, submissionId } = await params;
  const supabase = createServiceClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, profiles(full_name), exams(id, title, teacher_id)")
    .eq("id", submissionId)
    .eq("exam_id", id)
    .single();

  if (!submission || submission.exams?.teacher_id !== teacher.id) notFound();

  const { data: answers } = await supabase
    .from("submission_answers")
    .select("*, exam_questions(question_no, sub_label, question_type, correct_answer, correct_answers_json, score, topic, order_no)")
    .eq("submission_id", submissionId);

  const { data: questions } = await supabase
    .from("exam_questions")
    .select("id, parent_question_id, question_no, sub_label, question_type, score, topic, order_no")
    .eq("exam_id", id)
    .order("order_no");
  const { data: examSubmissions } = await supabase
    .from("submissions")
    .select("id, student_id, status, final_score, started_at, submitted_at")
    .eq("exam_id", id);

  const analysis = analyzeSubmission(questions ?? [], answers ?? []);
  const ranking = rankSubmissions(examSubmissions ?? []);
  const ownRank = ranking.find((row) => row.id === submission.id);
  const average = ranking.length ? ranking.reduce((sum, row) => sum + row.score, 0) / ranking.length : 0;
  const scoreDiff = Number(submission.final_score ?? 0) - average;

  const sortedAnswers = [...(answers ?? [])].sort((a: any, b: any) => {
    return Number(a.exam_questions?.order_no ?? 0) - Number(b.exam_questions?.order_no ?? 0);
  });

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Bài làm của</p>
          <h2 className="text-xl font-black text-slate-950">{submission.profiles?.full_name ?? "Học sinh"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/teacher/exams/${id}/results`}>
            <Button variant="secondary" className="gap-2">
              <ArrowLeft size={16} />
              Danh sách kết quả
            </Button>
          </Link>
          <Link href={`/teacher/students/${submission.student_id}`}>
            <Button variant="secondary" className="gap-2">
              <UserRound size={16} />
              Hồ sơ học sinh
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Điểm</p>
          <div className="mt-2"><ScoreBadge score={submission.final_score} /></div>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Trạng thái</p>
          <p className="mt-2 text-xl font-bold">{formatSubmissionStatus(submission.status)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-sm text-slate-600">Nộp lúc</p>
          <p className="mt-2 text-xl font-bold">{formatDateTime(submission.submitted_at)}</p>
        </div>
      </div>

      {submission.status !== "doing" ? (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="surface p-4">
              <p className="text-sm text-slate-600">Xếp hạng trong đề</p>
              <p className="mt-2 text-xl font-bold">{ownRank ? `${ownRank.rank}/${ranking.length}` : "-"}</p>
            </div>
            <div className="surface p-4">
              <p className="text-sm text-slate-600">So với điểm trung bình ({formatScore(average)})</p>
              <p className={scoreDiff >= 0 ? "mt-2 text-xl font-bold text-emerald-700" : "mt-2 text-xl font-bold text-rose-700"}>
                {scoreDiff >= 0 ? "+" : "-"}{formatScore(Math.abs(scoreDiff))} điểm
              </p>
            </div>
            <div className="surface p-4">
              <p className="text-sm text-slate-600">Đúng / Sai / Bỏ trống</p>
              <p className="mt-2 text-xl font-bold">
                <span className="text-emerald-700">{analysis.correct}</span> / <span className="text-rose-700">{analysis.wrong}</span> / {analysis.blank}
              </p>
            </div>
          </div>
          <SectionBreakdown sections={analysis.sections} />
          <TopicBreakdown topics={analysis.topics} />
        </>
      ) : null}

      <div className="table-shell">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold">Đáp án học sinh đã chọn</h2>
          <p className="mt-1 text-sm text-slate-600">Đối chiếu bài làm của học sinh với đáp án đúng và điểm từng câu.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-3">Câu</th>
                <th className="p-3">Đáp án học sinh</th>
                <th className="p-3">Đáp án đúng</th>
                <th className="p-3">Kết quả</th>
                <th className="p-3">Điểm đạt</th>
                <th className="p-3">Điểm tối đa</th>
              </tr>
            </thead>
            <tbody>
              {sortedAnswers.map((answer: any) => (
                <tr key={answer.id} className="border-t">
                  <td className="p-3 font-medium">Câu {answer.exam_questions?.question_no}{answer.exam_questions?.sub_label ?? ""}</td>
                  <td className="p-3">{formatStudentAnswer(answer)}</td>
                  <td className="p-3">{formatCorrectAnswer(answer.exam_questions)}</td>
                  <td className="p-3">
                    <span className={answer.is_correct ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800" : "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800"}>
                      {answer.is_correct ? "Đúng" : "Sai"}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{formatScore(answer.score)}</td>
                  <td className="p-3">{formatScore(answer.exam_questions?.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function formatStudentAnswer(answer: any) {
  if (answer.selected_option) return answer.selected_option;
  if (answer.boolean_answer !== null && answer.boolean_answer !== undefined) return answer.boolean_answer ? "Đúng" : "Sai";
  return answer.answer_text || "-";
}

function formatCorrectAnswer(question: any) {
  if (!question) return "-";
  if (question.question_type === "true_false_item") return question.correct_answer === "true" ? "Đúng" : "Sai";
  if (question.question_type === "short_answer") {
    const answers = Array.isArray(question.correct_answers_json) ? question.correct_answers_json : [];
    return answers.length ? answers.join("; ") : "-";
  }
  return question.correct_answer || "-";
}

function formatSubmissionStatus(status: string) {
  if (status === "doing") return "Đang làm";
  if (status === "submitted") return "Đã nộp";
  if (status === "graded") return "Đã chấm";
  return status;
}
