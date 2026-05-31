import { createServiceClient } from "@/lib/supabase/server";

type TfItem = {
  questionId?: string;
  studentAnswer: boolean | null;
  correctAnswer: string | null;
};

export function normalizeMathAnswer(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
}

export function gradeSingleChoice(studentAnswer: string | null | undefined, correctAnswer: string | null | undefined, score: number) {
  return (studentAnswer ?? "").toUpperCase() === (correctAnswer ?? "").toUpperCase() ? score : 0;
}

export function gradeShortAnswer(studentAnswer: string | null | undefined, correctAnswersJson: unknown, score: number) {
  const normalized = normalizeMathAnswer(studentAnswer ?? "");
  const answers = Array.isArray(correctAnswersJson) ? correctAnswersJson : [];
  return answers.some((answer) => normalizeMathAnswer(String(answer)) === normalized) ? score : 0;
}

export function gradeTrueFalseGroup(items: TfItem[]) {
  const correctCount = items.filter((item) => {
    if (item.studentAnswer === null || item.studentAnswer === undefined) return false;
    return String(item.studentAnswer) === String(item.correctAnswer === "true" || item.correctAnswer === "D");
  }).length;
  const map = [0, 0.1, 0.25, 0.5, 1];
  return map[correctCount] ?? 0;
}

export async function gradeSubmission(submissionId: string) {
  const supabase = createServiceClient();
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, exam_id")
    .eq("id", submissionId)
    .single();
  if (submissionError || !submission) throw submissionError ?? new Error("Submission not found");

  const { data: questions, error: questionError } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", submission.exam_id)
    .order("order_no");
  if (questionError) throw questionError;

  const { data: answers, error: answerError } = await supabase
    .from("submission_answers")
    .select("*")
    .eq("submission_id", submissionId);
  if (answerError) throw answerError;

  const answerByQuestion = new Map((answers ?? []).map((answer) => [answer.question_id, answer]));
  let total = 0;
  const updates: Array<{ id: string; score: number; is_correct: boolean }> = [];

  for (const question of questions ?? []) {
    const answer = answerByQuestion.get(question.id);
    if (!answer || question.question_type === "true_false_group") continue;

    if (question.question_type === "single_choice") {
      const score = gradeSingleChoice(answer.selected_option, question.correct_answer, Number(question.score));
      total += score;
      updates.push({ id: answer.id, score, is_correct: score > 0 });
    }

    if (question.question_type === "short_answer") {
      const score = gradeShortAnswer(answer.answer_text, question.correct_answers_json, Number(question.score));
      total += score;
      updates.push({ id: answer.id, score, is_correct: score > 0 });
    }
  }

  const groups = (questions ?? []).filter((question) => question.question_type === "true_false_group");
  for (const group of groups) {
    const items = (questions ?? []).filter((question) => question.parent_question_id === group.id);
    const groupItems = items.map((item) => ({
      questionId: item.id,
      studentAnswer: answerByQuestion.get(item.id)?.boolean_answer ?? null,
      correctAnswer: item.correct_answer
    }));
    const groupScore = gradeTrueFalseGroup(groupItems);
    total += groupScore;

    items.forEach((item, index) => {
      const answer = answerByQuestion.get(item.id);
      if (!answer) return;
      const isCorrect = String(answer.boolean_answer) === String(item.correct_answer === "true" || item.correct_answer === "D");
      updates.push({ id: answer.id, score: index === 0 ? groupScore : 0, is_correct: isCorrect });
    });
  }

  for (const update of updates) {
    await supabase.from("submission_answers").update({ score: update.score, is_correct: update.is_correct }).eq("id", update.id);
  }

  const rounded = Math.round(total * 100) / 100;
  await supabase
    .from("submissions")
    .update({ auto_score: rounded, final_score: rounded, status: "graded" })
    .eq("id", submissionId);

  return rounded;
}
