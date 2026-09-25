import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreBadge } from "@/components/exam/Badges";
import { rankSubmissions } from "@/components/exam/Leaderboard";
import { SectionBreakdown, TopicBreakdown } from "@/components/exam/StudentAnalysis";
import { analyzeSubmission, mergeAnalyses } from "@/lib/analysis";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDateTime, formatScore } from "@/lib/utils/format";

export default async function StudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const teacher = await requireTeacher();
  const { studentId } = await params;
  const supabase = createServiceClient();

  // Chỉ xem được học sinh thuộc lớp của giáo viên này.
  const { data: memberships } = await supabase
    .from("class_students")
    .select("classes!inner(id, name, teacher_id)")
    .eq("student_id", studentId)
    .eq("classes.teacher_id", teacher.id);
  if (!memberships?.length) notFound();
  const classNames = memberships.map((item: any) => item.classes?.name).filter(Boolean).join(", ");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", studentId).single();

  const { data: ownSubmissions } = await supabase
    .from("submissions")
    .select("id, exam_id, status, final_score, started_at, submitted_at, exams!inner(id, title, teacher_id, total_score)")
    .eq("student_id", studentId)
    .eq("exams.teacher_id", teacher.id)
    .neq("status", "doing")
    .order("submitted_at", { ascending: true });

  const submissions = (ownSubmissions ?? []) as any[];
  const examIds = submissions.map((item) => item.exam_id);
  const submissionIds = submissions.map((item) => item.id);

  const [{ data: allExamSubmissions }, { data: questions }, { data: answers }] = examIds.length
    ? await Promise.all([
        supabase.from("submissions").select("id, exam_id, student_id, status, final_score, started_at, submitted_at").in("exam_id", examIds),
        supabase
          .from("exam_questions")
          .select("id, exam_id, parent_question_id, question_no, sub_label, question_type, score, topic, order_no")
          .in("exam_id", examIds),
        supabase
          .from("submission_answers")
          .select("submission_id, question_id, selected_option, boolean_answer, answer_text, is_correct, score")
          .in("submission_id", submissionIds)
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];

  const history = submissions.map((submission) => {
    const ranking = rankSubmissions((allExamSubmissions ?? []).filter((item) => item.exam_id === submission.exam_id));
    const average = ranking.length ? ranking.reduce((sum, row) => sum + row.score, 0) / ranking.length : 0;
    const analysis = analyzeSubmission(
      (questions ?? []).filter((question) => question.exam_id === submission.exam_id),
      (answers ?? []).filter((answer) => answer.submission_id === submission.id)
    );
    return {
      submission,
      score: Number(submission.final_score ?? 0),
      average,
      rank: ranking.find((row) => row.id === submission.id)?.rank,
      participants: ranking.length,
      analysis
    };
  });

  const scores = history.map((item) => item.score);
  const averageScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : null;
  const merged = mergeAnalyses(history.map((item) => item.analysis));
  const weakTopics = merged.topics.filter((topic) => topic.rate < 50 && topic.total >= 2);

  return (
    <>
      <PageHeader title={profile?.full_name ?? "Học sinh"} description={`Hồ sơ học tập · Lớp: ${classNames}`} />

      {!history.length ? (
        <EmptyState title="Chưa có bài làm" description="Học sinh này chưa nộp đề nào của bạn." />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="surface p-4">
              <p className="text-sm text-slate-600">Số đề đã làm</p>
              <p className="mt-2 text-2xl font-bold">{history.length}</p>
            </div>
            <div className="surface p-4">
              <p className="text-sm text-slate-600">Điểm trung bình</p>
              <p className="mt-2 text-2xl font-bold">{formatScore(averageScore)}</p>
            </div>
            <div className="surface p-4">
              <p className="text-sm text-slate-600">Cao nhất / Thấp nhất</p>
              <p className="mt-2 text-2xl font-bold">{formatScore(Math.max(...scores))} / {formatScore(Math.min(...scores))}</p>
            </div>
            <div className="surface p-4">
              <p className="text-sm text-slate-600">So với đề trước</p>
              {trend === null ? (
                <p className="mt-2 text-2xl font-bold">-</p>
              ) : (
                <p className={trend >= 0 ? "mt-2 flex items-center gap-2 text-2xl font-bold text-emerald-700" : "mt-2 flex items-center gap-2 text-2xl font-bold text-rose-700"}>
                  {trend >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                  {trend >= 0 ? "+" : "-"}{formatScore(Math.abs(trend))}
                </p>
              )}
            </div>
          </div>

          {weakTopics.length ? (
            <div className="surface mb-6 border-l-4 border-rose-500 p-4">
              <p className="font-semibold text-slate-950">Chủ đề cần ôn lại</p>
              <p className="mt-1 text-sm text-slate-600">{weakTopics.map((topic) => `${topic.topic} (${topic.rate}%)`).join(" · ")}</p>
            </div>
          ) : null}

          <section className="table-shell mb-6">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold">Lịch sử làm bài</h2>
              <p className="mt-1 text-sm text-slate-600">Điểm từng đề so với điểm trung bình của cả đề.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="p-3">Đề thi</th>
                    <th className="p-3">Điểm</th>
                    <th className="p-3">TB đề</th>
                    <th className="p-3">Hạng</th>
                    <th className="p-3">Đúng / Sai / Trống</th>
                    <th className="p-3">Nộp lúc</th>
                    <th className="p-3">Bài làm</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((item) => {
                    const diff = item.score - item.average;
                    return (
                      <tr key={item.submission.id} className="border-t">
                        <td className="p-3 font-medium">{item.submission.exams?.title}</td>
                        <td className="p-3"><ScoreBadge score={item.score} /></td>
                        <td className="p-3">
                          {formatScore(item.average)}{" "}
                          <span className={diff >= 0 ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-rose-700"}>
                            ({diff >= 0 ? "+" : "-"}{formatScore(Math.abs(diff))})
                          </span>
                        </td>
                        <td className="p-3">{item.rank ? `${item.rank}/${item.participants}` : "-"}</td>
                        <td className="p-3">
                          <span className="text-emerald-700">{item.analysis.correct}</span> / <span className="text-rose-700">{item.analysis.wrong}</span> / {item.analysis.blank}
                        </td>
                        <td className="p-3">{formatDateTime(item.submission.submitted_at)}</td>
                        <td className="p-3">
                          <Link href={`/teacher/exams/${item.submission.exam_id}/results/${item.submission.id}`}>
                            <Button variant="secondary" className="h-9 gap-2 px-3">
                              <Eye size={16} />
                              Xem
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <h2 className="mb-3 font-semibold">Tỉ lệ đúng theo từng phần (tất cả các đề)</h2>
          <SectionBreakdown sections={merged.sections} showScore={false} />
          <TopicBreakdown topics={merged.topics} title="Chủ đề mạnh / yếu (tất cả các đề)" />
        </>
      )}
    </>
  );
}
