// Cấu trúc các dạng đề. Câu hỏi được đánh số liên tục theo thứ tự các phần.
export type ExamFormatPart =
  | { type: "single_choice"; count: number; score: number }
  | { type: "true_false"; count: number; score: number }
  | { type: "short_answer"; count: number; score: number }
  | { type: "essay"; scores: number[] };

export type ExamFormat = {
  key: string;
  label: string;
  parts: ExamFormatPart[];
};

export const EXAM_FORMATS: ExamFormat[] = [
  {
    key: "math_thpt_2025",
    label: "Toán THPT 2025 (12 TN · 4 Đ/S · 6 TLN)",
    parts: [
      { type: "single_choice", count: 12, score: 0.25 },
      { type: "true_false", count: 4, score: 1 },
      { type: "short_answer", count: 6, score: 0.5 }
    ]
  },
  {
    key: "math_12_2_4_4",
    label: "Toán có tự luận (12 TN · 2 Đ/S · 4 TLN · 4 TL)",
    parts: [
      { type: "single_choice", count: 12, score: 0.25 },
      { type: "true_false", count: 2, score: 1 },
      { type: "short_answer", count: 4, score: 0.5 },
      { type: "essay", scores: [1, 1, 0.5, 0.5] }
    ]
  }
];

export const DEFAULT_EXAM_FORMAT = EXAM_FORMATS[0].key;

export function getExamFormat(key: string | null | undefined) {
  return EXAM_FORMATS.find((format) => format.key === key) ?? EXAM_FORMATS[0];
}

export function examFormatTotalScore(format: ExamFormat) {
  return format.parts.reduce((sum, part) => sum + (part.type === "essay" ? part.scores.reduce((a, b) => a + b, 0) : part.count * part.score), 0);
}

export function examFormatQuestionCount(format: ExamFormat) {
  return format.parts.reduce((sum, part) => sum + (part.type === "essay" ? part.scores.length : part.count), 0);
}
