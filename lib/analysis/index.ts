import { trueFalseGroupScore } from "@/lib/grading";

type AnalysisQuestion = {
  id: string;
  parent_question_id: string | null;
  question_no: number;
  sub_label: string | null;
  question_type: string;
  score: number | string;
  topic: string | null;
  order_no: number;
};

type AnalysisAnswer = {
  question_id: string;
  selected_option: string | null;
  boolean_answer: boolean | null;
  answer_text: string | null;
  is_correct: boolean | null;
  score: number | string | null;
};

export type SectionKey = "single_choice" | "true_false" | "short_answer";

export type SectionSummary = {
  key: SectionKey;
  title: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  score: number;
  maxScore: number;
};

export type TopicSummary = {
  topic: string;
  correct: number;
  total: number;
  rate: number;
};

export type SubmissionAnalysis = {
  sections: SectionSummary[];
  topics: TopicSummary[];
  correct: number;
  wrong: number;
  blank: number;
  total: number;
};

export const SECTION_TITLES: Record<SectionKey, string> = {
  single_choice: "Phần I. Trắc nghiệm",
  true_false: "Phần II. Đúng/Sai",
  short_answer: "Phần III. Trả lời ngắn"
};

const NO_TOPIC = "Chưa gắn chủ đề";

function isBlank(answer: AnalysisAnswer | undefined) {
  if (!answer) return true;
  return !answer.selected_option && (answer.boolean_answer === null || answer.boolean_answer === undefined) && !answer.answer_text?.trim();
}

function sectionOf(question: AnalysisQuestion): SectionKey | null {
  if (question.question_type === "single_choice") return "single_choice";
  if (question.question_type === "true_false_item") return "true_false";
  if (question.question_type === "short_answer") return "short_answer";
  return null;
}

// Phân tích một bài làm: điểm từng phần, số câu đúng/sai/bỏ trống, tỉ lệ đúng theo chủ đề.
export function analyzeSubmission(questions: AnalysisQuestion[], answers: AnalysisAnswer[]): SubmissionAnalysis {
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const sections = new Map<SectionKey, SectionSummary>(
    (Object.keys(SECTION_TITLES) as SectionKey[]).map((key) => [
      key,
      { key, title: SECTION_TITLES[key], correct: 0, wrong: 0, blank: 0, total: 0, score: 0, maxScore: 0 }
    ])
  );
  const topics = new Map<string, { correct: number; total: number }>();

  for (const question of questions) {
    const key = sectionOf(question);
    if (!key) continue;
    const section = sections.get(key)!;
    const answer = answerByQuestion.get(question.id);
    const blank = isBlank(answer);
    const correct = !blank && answer?.is_correct === true;

    section.total += 1;
    if (blank) section.blank += 1;
    else if (correct) section.correct += 1;
    else section.wrong += 1;

    if (key !== "true_false") {
      section.maxScore += Number(question.score ?? 0);
      section.score += correct ? Number(answer?.score ?? 0) : 0;
    }

    const parent = question.parent_question_id ? questionById.get(question.parent_question_id) : undefined;
    const topic = question.topic?.trim() || parent?.topic?.trim() || NO_TOPIC;
    const topicRow = topics.get(topic) ?? { correct: 0, total: 0 };
    topicRow.total += 1;
    if (correct) topicRow.correct += 1;
    topics.set(topic, topicRow);
  }

  // Phần II chấm theo nhóm 4 ý nên tính lại điểm theo từng nhóm.
  const trueFalse = sections.get("true_false")!;
  for (const group of questions.filter((question) => question.question_type === "true_false_group")) {
    const items = questions.filter((question) => question.parent_question_id === group.id);
    trueFalse.maxScore += Number(group.score ?? 1);
    const correctCount = items.filter((item) => {
      const answer = answerByQuestion.get(item.id);
      return !isBlank(answer) && answer?.is_correct === true;
    }).length;
    trueFalse.score += trueFalseGroupScore(correctCount);
  }

  const sectionList = Array.from(sections.values()).filter((section) => section.total > 0);
  return {
    sections: sectionList,
    topics: Array.from(topics.entries())
      .map(([topic, row]) => ({ topic, ...row, rate: row.total ? Math.round((row.correct / row.total) * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate || b.total - a.total),
    correct: sectionList.reduce((sum, section) => sum + section.correct, 0),
    wrong: sectionList.reduce((sum, section) => sum + section.wrong, 0),
    blank: sectionList.reduce((sum, section) => sum + section.blank, 0),
    total: sectionList.reduce((sum, section) => sum + section.total, 0)
  };
}

// Cộng dồn nhiều bài phân tích (dùng cho hồ sơ học sinh qua nhiều đề).
export function mergeAnalyses(analyses: SubmissionAnalysis[]) {
  const sections = new Map<SectionKey, SectionSummary>();
  const topics = new Map<string, { correct: number; total: number }>();

  for (const analysis of analyses) {
    for (const section of analysis.sections) {
      const row = sections.get(section.key) ?? { ...section, correct: 0, wrong: 0, blank: 0, total: 0, score: 0, maxScore: 0 };
      row.correct += section.correct;
      row.wrong += section.wrong;
      row.blank += section.blank;
      row.total += section.total;
      row.score += section.score;
      row.maxScore += section.maxScore;
      sections.set(section.key, row);
    }
    for (const topic of analysis.topics) {
      const row = topics.get(topic.topic) ?? { correct: 0, total: 0 };
      row.correct += topic.correct;
      row.total += topic.total;
      topics.set(topic.topic, row);
    }
  }

  return {
    sections: (Object.keys(SECTION_TITLES) as SectionKey[]).map((key) => sections.get(key)).filter(Boolean) as SectionSummary[],
    topics: Array.from(topics.entries())
      .map(([topic, row]) => ({ topic, ...row, rate: row.total ? Math.round((row.correct / row.total) * 100) : 0 }))
      .sort((a, b) => a.rate - b.rate || b.total - a.total)
  };
}
