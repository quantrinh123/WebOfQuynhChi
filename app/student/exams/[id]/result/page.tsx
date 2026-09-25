import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookMarked, CheckCircle2, Clock3, Crown, EyeOff, FileText, MinusCircle, RotateCcw, Trophy, XCircle } from "lucide-react";
import { PdfViewer } from "@/components/exam/PdfViewer";
import { rankSubmissions, type LeaderboardRow } from "@/components/exam/Leaderboard";
import { Confetti } from "@/components/student/Confetti";
import { MathDecor } from "@/components/student/MathDecor";
import { ScoreRing, scoreMessage } from "@/components/student/ScoreRing";
import { SubmitButton } from "@/components/ui/ActionForm";
import { retakeExam } from "@/lib/actions/student";
import { analyzeSubmission } from "@/lib/analysis";
import { requireStudent } from "@/lib/auth";
import { getStudentExamAccess } from "@/lib/exam-access";
import { createServiceClient } from "@/lib/supabase/server";
import { cn, formatDateTime, formatScore } from "@/lib/utils/format";

type AnswerStatus = "correct" | "wrong" | "blank";

export default async function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const { data: submission } = await supabase.from("submissions").select("*").eq("exam_id", id).eq("student_id", student.id).maybeSingle();
  if (!exam) notFound();
  if (!submission) redirect(`/student/exams/${id}/start`);

  const [{ data: questions }, { data: answers }, access] = await Promise.all([
    supabase
      .from("exam_questions")
      .select("id, parent_question_id, question_no, sub_label, question_type, correct_answer, correct_answers_json, score, topic, order_no")
      .eq("exam_id", id)
      .order("order_no"),
    supabase.from("submission_answers").select("*").eq("submission_id", submission.id),
    getStudentExamAccess(supabase, id, student.id)
  ]);
  const { data: signedAnswer } =
    exam.show_answer_after_submit && exam.answer_pdf_path ? await supabase.storage.from("exam-pdfs").createSignedUrl(exam.answer_pdf_path, 60 * 60) : { data: null };
  const { data: examSubmissions } = exam.show_score_after_submit
    ? await supabase.from("submissions").select("id, student_id, status, final_score, started_at, submitted_at, profiles(full_name)").eq("exam_id", id)
    : { data: null };

  const showScore = Boolean(exam.show_score_after_submit);
  const maxScore = Number(exam.total_score || 10);
  const score = Number(submission.final_score ?? 0);
  const ratio = maxScore ? score / maxScore : 0;
  const message = scoreMessage(ratio);
  const analysis = analyzeSubmission(questions ?? [], answers ?? []);
  const ranking = rankSubmissions((examSubmissions ?? []) as any[]);
  const ownRank = ranking.find((row) => row.studentId === student.id);
  const durationMs =
    submission.started_at && submission.submitted_at ? new Date(submission.submitted_at).getTime() - new Date(submission.started_at).getTime() : null;
  const weakTopics = analysis.topics.filter((topic) => topic.rate < 50 && topic.topic !== "Chưa gắn chủ đề");

  const answerById = new Map((answers ?? []).map((answer) => [answer.question_id, answer]));
  const answerable = (questions ?? []).filter((question) => question.question_type !== "true_false_group");
  const statusOf = (questionId: string): AnswerStatus => {
    const answer = answerById.get(questionId);
    const blank = !answer || (!answer.selected_option && (answer.boolean_answer === null || answer.boolean_answer === undefined) && !answer.answer_text?.trim());
    if (blank) return "blank";
    return answer.is_correct ? "correct" : "wrong";
  };
  const retakeAction = retakeExam.bind(null, id);

  return (
    <div className="grid gap-6">
      {showScore && ratio >= 0.8 ? <Confetti /> : null}
      <Link href="/student/exams" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} />
        Danh sách bài thi
      </Link>

      {/* Điểm tổng */}
      <section className="surface animate-rise-in relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
        <MathDecor preset="result" variant="pastel" />
        {showScore ? (
          <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
            <ScoreRing id="total" score={score} max={maxScore} size={168} stroke={3.2} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-500">{exam.title}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {message.title} <span aria-hidden>{message.emoji}</span>
              </h1>
              <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
                <StatPill icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" value={analysis.correct} label="đúng" />
                <StatPill icon={XCircle} tone="bg-rose-50 text-rose-700" value={analysis.wrong} label="sai" />
                <StatPill icon={MinusCircle} tone="bg-slate-100 text-slate-600" value={analysis.blank} label="bỏ trống" />
                {ownRank ? <StatPill icon={Trophy} tone="bg-amber-50 text-amber-700" value={`#${ownRank.rank}`} label={`/ ${ranking.length}`} /> : null}
                {durationMs !== null ? <StatPill icon={Clock3} tone="bg-sky-50 text-sky-700" value={formatDuration(durationMs)} label="" /> : null}
              </div>
            </div>
            {access.ok ? (
              <form action={retakeAction} className="md:self-start">
                <SubmitButton variant="secondary" pendingText="Đang tạo lượt mới..." confirmMessage="Làm lại đề? Bài làm và điểm hiện tại sẽ bị xoá.">
                  <RotateCcw size={16} />
                  Làm lại
                </SubmitButton>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="relative flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg">
              <EyeOff size={28} />
            </span>
            <h1 className="text-2xl font-black text-slate-950">Đã nộp bài thành công!</h1>
            <p className="max-w-md text-slate-600">
              Bài làm &quot;{exam.title}&quot; đã được ghi nhận lúc {formatDateTime(submission.submitted_at)}. Giáo viên chưa công bố điểm.
            </p>
          </div>
        )}
      </section>

      {showScore ? (
        <>
          {/* Từng phần + chủ đề cần ôn */}
          <section className="grid gap-4 md:grid-cols-3">
            {analysis.sections.map((section, index) => (
              <div key={section.key} className="surface animate-rise-in flex items-center gap-4 p-5" style={{ animationDelay: `${100 + index * 80}ms` }}>
                <ScoreRing id={section.key} score={section.score} max={section.maxScore || 1} size={76} stroke={3.6} />
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{section.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    <span className="text-emerald-600">{section.correct} đúng</span> · <span className="text-rose-600">{section.wrong} sai</span> · {section.blank} trống
                  </p>
                </div>
              </div>
            ))}
          </section>

          {weakTopics.length ? (
            <section className="surface flex flex-col gap-3 border-amber-200/70 bg-amber-50/60 p-5 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                <BookMarked size={20} />
              </span>
              <div>
                <p className="font-black text-slate-950">Chủ đề nên ôn lại</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {weakTopics.map((topic) => (
                    <span key={topic.topic} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                      {topic.topic} · {topic.correct}/{topic.total}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Bản đồ đáp án */}
            <section className="surface p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Bản đồ bài làm</h2>
                <div className="flex gap-3 text-xs font-semibold text-slate-500">
                  <Legend className="bg-emerald-500" label="Đúng" />
                  <Legend className="bg-rose-500" label="Sai" />
                  <Legend className="bg-slate-300" label="Bỏ trống" />
                </div>
              </div>
              <div className="grid gap-5">
                {[
                  { title: "Phần I", items: answerable.filter((q) => q.question_type === "single_choice") },
                  { title: "Phần II", items: answerable.filter((q) => q.question_type === "true_false_item") },
                  { title: "Phần III", items: answerable.filter((q) => q.question_type === "short_answer") }
                ].map((part) =>
                  part.items.length ? (
                    <div key={part.title}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{part.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {part.items.map((question, index) => {
                          const status = statusOf(question.id);
                          return (
                            <span
                              key={question.id}
                              title={`Câu ${question.question_no}${question.sub_label ?? ""}: ${status === "correct" ? "Đúng" : status === "wrong" ? "Sai" : "Bỏ trống"}`}
                              className={cn(
                                "animate-rise-in flex h-10 min-w-10 items-center justify-center rounded-xl px-1.5 text-xs font-black",
                                status === "correct" && "bg-emerald-500 text-white shadow-[0_4px_0_#059669]",
                                status === "wrong" && "bg-rose-500 text-white shadow-[0_4px_0_#e11d48]",
                                status === "blank" && "bg-slate-200 text-slate-500 shadow-[0_4px_0_#cbd5e1]"
                              )}
                              style={{ animationDelay: `${index * 25}ms` }}
                            >
                              {question.question_no}
                              {question.sub_label ?? ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null
                )}
              </div>

              <details className="group mt-6 rounded-2xl border border-slate-200/70">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                  Xem chi tiết từng câu
                  <span className="text-slate-400 transition group-open:rotate-180">▾</span>
                </summary>
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="table-head">
                      <tr>
                        <th className="p-3">Câu</th>
                        <th className="p-3">Bạn chọn</th>
                        <th className="p-3">Đáp án đúng</th>
                        <th className="p-3">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answerable.map((question) => {
                        const status = statusOf(question.id);
                        return (
                          <tr key={question.id} className="border-t border-slate-100">
                            <td className="p-3 font-bold">
                              Câu {question.question_no}
                              {question.sub_label ?? ""}
                            </td>
                            <td className="p-3">{formatStudentAnswer(answerById.get(question.id))}</td>
                            <td className="p-3 font-semibold text-slate-900">{formatCorrectAnswer(question)}</td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-bold",
                                  status === "correct" && "bg-emerald-100 text-emerald-800",
                                  status === "wrong" && "bg-rose-100 text-rose-800",
                                  status === "blank" && "bg-slate-100 text-slate-600"
                                )}
                              >
                                {status === "correct" ? "Đúng" : status === "wrong" ? "Sai" : "Bỏ trống"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            {/* Xếp hạng */}
            <StudentLeaderboard rows={ranking} studentId={student.id} />
          </div>
        </>
      ) : null}

      {signedAnswer?.signedUrl ? (
        <section className="surface overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileText size={19} />
            </span>
            <h2 className="font-black text-slate-950">Lời giải chi tiết</h2>
          </div>
          <PdfViewer fileUrl={signedAnswer.signedUrl} height={680} className="w-full bg-white" />
        </section>
      ) : null}
    </div>
  );
}

function StudentLeaderboard({ rows, studentId }: { rows: LeaderboardRow[]; studentId: string }) {
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3, 10);
  const own = rows.find((row) => row.studentId === studentId);
  const ownOutside = own && own.rank > 10;
  // Thứ tự hiển thị bục: hạng 2 - hạng 1 - hạng 3.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderboardRow[];
  const podiumStyle: Record<number, { height: string; tone: string; medal: string }> = {
    1: { height: "h-28", tone: "from-amber-300 to-amber-500", medal: "text-amber-500" },
    2: { height: "h-20", tone: "from-slate-200 to-slate-400", medal: "text-slate-400" },
    3: { height: "h-16", tone: "from-orange-200 to-orange-400", medal: "text-orange-500" }
  };

  return (
    <section className="surface self-start p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <Trophy size={20} className="text-amber-500" />
        Bảng xếp hạng
      </h2>
      <p className="mt-0.5 text-xs font-medium text-slate-500">Điểm cao hơn xếp trên, bằng điểm thì ai làm nhanh hơn xếp trên.</p>

      {!rows.length ? (
        <p className="mt-6 text-sm text-slate-500">Chưa có ai nộp bài.</p>
      ) : (
        <>
          <div className="mt-6 flex items-end justify-center gap-3">
            {podiumOrder.map((row) => {
              const style = podiumStyle[Math.min(row.rank, 3)] ?? podiumStyle[3];
              const isMe = row.studentId === studentId;
              return (
                <div key={row.id} className="animate-rise-in flex w-24 flex-col items-center" style={{ animationDelay: `${row.rank * 120}ms` }}>
                  {row.rank === 1 ? <Crown size={22} className="mb-1 text-amber-500" /> : null}
                  <Initials name={row.name} highlighted={isMe} />
                  <p className={cn("mt-1.5 w-full truncate text-center text-xs font-bold", isMe ? "text-teal-700" : "text-slate-800")}>{isMe ? "Bạn" : row.name}</p>
                  <p className="text-xs font-black text-slate-950">{formatScore(row.score)}</p>
                  <div className={cn("mt-2 flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2 text-lg font-black text-white shadow-inner", style.height, style.tone)}>
                    {row.rank}
                  </div>
                </div>
              );
            })}
          </div>

          {rest.length || ownOutside ? (
            <ol className="mt-4 grid gap-1.5">
              {rest.map((row) => (
                <RankRow key={row.id} row={row} isMe={row.studentId === studentId} />
              ))}
              {ownOutside ? (
                <>
                  <li className="text-center text-slate-300">⋯</li>
                  <RankRow row={own} isMe />
                </>
              ) : null}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
}

function RankRow({ row, isMe }: { row: LeaderboardRow; isMe: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 rounded-xl px-3 py-2", isMe ? "bg-teal-50 ring-1 ring-teal-200" : "bg-slate-50/70")}>
      <span className="w-6 text-center text-sm font-black text-slate-400">{row.rank}</span>
      <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", isMe ? "text-teal-800" : "text-slate-800")}>{isMe ? `${row.name} (Bạn)` : row.name}</span>
      <span className="text-sm font-black text-slate-950">{formatScore(row.score)}</span>
    </li>
  );
}

function Initials({ name, highlighted }: { name: string; highlighted?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white ring-4",
        highlighted ? "from-teal-500 to-cyan-500 ring-teal-200" : "from-indigo-400 to-sky-500 ring-white"
      )}
    >
      {initials}
    </span>
  );
}

function StatPill({ icon: Icon, tone, value, label }: { icon: React.ElementType; tone: string; value: number | string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold", tone)}>
      <Icon size={15} />
      <span className="font-black">{value}</span>
      {label ? <span className="font-semibold opacity-80">{label}</span> : null}
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded", className)} />
      {label}
    </span>
  );
}

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes} phút ${seconds.toString().padStart(2, "0")}s`;
}

function formatStudentAnswer(answer: any) {
  if (!answer) return <span className="text-slate-400">-</span>;
  if (answer.selected_option) return answer.selected_option;
  if (answer.boolean_answer !== null && answer.boolean_answer !== undefined) return answer.boolean_answer ? "Đúng" : "Sai";
  return answer.answer_text || <span className="text-slate-400">-</span>;
}

function formatCorrectAnswer(question: any) {
  if (question.question_type === "true_false_item") return question.correct_answer === "true" ? "Đúng" : "Sai";
  if (question.question_type === "short_answer") {
    const answers = Array.isArray(question.correct_answers_json) ? question.correct_answers_json : [];
    return answers.length ? answers.join("; ") : "-";
  }
  return question.correct_answer || "-";
}
