export type Role = "teacher" | "student";
export type ExamStatus = "draft" | "open" | "closed";
export type SectionType = "single_choice" | "true_false" | "short_answer";
export type QuestionType = "single_choice" | "true_false_group" | "true_false_item" | "short_answer";
export type SubmissionStatus = "doing" | "submitted" | "graded";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Class = {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Exam = {
  id: string;
  teacher_id: string;
  title: string;
  grade: string;
  duration_minutes: number;
  total_score: number;
  question_pdf_path: string | null;
  answer_pdf_path: string | null;
  exam_format: string;
  status: ExamStatus;
  show_score_after_submit: boolean;
  show_answer_after_submit: boolean;
  created_at: string;
  updated_at: string;
};

export type ExamQuestion = {
  id: string;
  exam_id: string;
  section_id: string;
  parent_question_id: string | null;
  question_no: number;
  sub_label: string | null;
  question_type: QuestionType;
  correct_answer: string | null;
  correct_answers_json: string[] | null;
  score: number;
  scoring_rule: string | null;
  topic: string | null;
  order_no: number;
};

export type Submission = {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  auto_score: number;
  final_score: number;
  status: SubmissionStatus;
  created_at: string;
};

export type SubmissionAnswer = {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option: string | null;
  boolean_answer: boolean | null;
  answer_text: string | null;
  is_correct: boolean | null;
  score: number;
};
