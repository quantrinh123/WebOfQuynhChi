type AnswerKeyQuestion = {
  question_type: string;
  correct_answer: string | null;
  correct_answers_json: unknown;
};

export function isAnswerMissing(question: AnswerKeyQuestion) {
  if (question.question_type === "single_choice") return !["A", "B", "C", "D"].includes(String(question.correct_answer ?? "").toUpperCase());
  if (question.question_type === "true_false_item") return question.correct_answer !== "true" && question.correct_answer !== "false";
  if (question.question_type === "short_answer") return !Array.isArray(question.correct_answers_json) || question.correct_answers_json.length === 0;
  return false;
}

export function countMissingAnswers(questions: AnswerKeyQuestion[]) {
  return questions.filter(isAnswerMissing).length;
}

export type ExamSetupSteps = {
  answerKeyDone: boolean;
  missingAnswers: number;
  assigned: boolean;
  opened: boolean;
};

export function getExamSetupSteps(input: { questions: AnswerKeyQuestion[]; assignmentCount: number; status: string }): ExamSetupSteps {
  const missingAnswers = countMissingAnswers(input.questions);
  return {
    answerKeyDone: input.questions.length > 0 && missingAnswers === 0,
    missingAnswers,
    assigned: input.assignmentCount > 0,
    opened: input.status !== "draft"
  };
}
