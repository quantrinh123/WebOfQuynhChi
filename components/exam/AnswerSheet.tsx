"use client";

import { useMemo, useState, useTransition } from "react";
import { saveAnswer, submitExam } from "@/lib/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Question = {
  id: string;
  parent_question_id: string | null;
  question_no: number;
  sub_label: string | null;
  question_type: string;
};

type ExistingAnswer = {
  question_id: string;
  selected_option: string | null;
  boolean_answer: boolean | null;
  answer_text: string | null;
};

export function AnswerSheet({ submissionId, questions, existingAnswers }: { submissionId: string; questions: Question[]; existingAnswers: ExistingAnswer[] }) {
  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    existingAnswers.forEach((answer) => {
      map[answer.question_id] = answer.selected_option ?? (answer.boolean_answer === null ? "" : String(answer.boolean_answer)) ?? answer.answer_text ?? "";
      if (answer.answer_text) map[answer.question_id] = answer.answer_text;
    });
    return map;
  }, [existingAnswers]);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [pending, startTransition] = useTransition();
  const singles = questions.filter((q) => q.question_type === "single_choice");
  const groups = questions.filter((q) => q.question_type === "true_false_group");
  const shorts = questions.filter((q) => q.question_type === "short_answer");

  function update(question: Question, value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    startTransition(() => {
      if (question.question_type === "single_choice") void saveAnswer(submissionId, question.id, { selected_option: value });
      if (question.question_type === "true_false_item") void saveAnswer(submissionId, question.id, { boolean_answer: value === "true" });
      if (question.question_type === "short_answer") void saveAnswer(submissionId, question.id, { answer_text: value });
    });
  }

  function submit() {
    const answerable = questions.filter((q) => q.question_type !== "true_false_group");
    const missing = answerable.filter((q) => !answers[q.id]).length;
    if (missing && !window.confirm(`Bạn còn ${missing} câu chưa trả lời. Bạn có chắc muốn nộp không?`)) return;
    startTransition(() => {
      void submitExam(
        submissionId,
        answerable.map((question) => ({
          questionId: question.id,
          selected_option: question.question_type === "single_choice" ? answers[question.id] : undefined,
          boolean_answer: question.question_type === "true_false_item" ? answers[question.id] === "true" : undefined,
          answer_text: question.question_type === "short_answer" ? answers[question.id] : undefined
        }))
      );
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <section>
        <h2 className="mb-3 text-base font-semibold">Phần I</h2>
        <div className="grid gap-2">
          {singles.map((q) => (
            <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="mb-2 text-sm font-semibold">Câu {q.question_no}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {["A", "B", "C", "D"].map((option) => (
                  <label key={option} className="flex h-10 items-center justify-center gap-1 rounded-md border border-slate-200 text-sm transition hover:bg-slate-50">
                    <input type="radio" name={q.id} checked={answers[q.id] === option} onChange={() => update(q, option)} /> {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Phần II</h2>
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="mb-2 text-sm font-semibold">Câu {group.question_no}</p>
              <div className="grid gap-2">
                {questions.filter((q) => q.parent_question_id === group.id).map((item) => (
                  <div key={item.id} className="grid grid-cols-[32px_1fr_1fr] items-center gap-2">
                    <span>{item.sub_label})</span>
                    <label className="rounded-md border border-slate-200 p-2 text-sm transition hover:bg-slate-50"><input type="radio" name={item.id} checked={answers[item.id] === "true"} onChange={() => update(item, "true")} /> Đúng</label>
                    <label className="rounded-md border border-slate-200 p-2 text-sm transition hover:bg-slate-50"><input type="radio" name={item.id} checked={answers[item.id] === "false"} onChange={() => update(item, "false")} /> Sai</label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Phần III</h2>
        <div className="grid gap-3">
          {shorts.map((q) => (
            <label key={q.id} className="block rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-medium shadow-sm">
              Câu {q.question_no}
              <Input className="mt-2" value={answers[q.id] ?? ""} onChange={(event) => update(q, event.target.value)} />
            </label>
          ))}
        </div>
      </section>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-white p-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
        <Button variant="secondary" disabled={pending} className="min-w-28">Lưu tạm</Button>
        <Button type="button" onClick={submit} disabled={pending} className="min-w-32">{pending ? "Đang xử lý..." : "Nộp bài"}</Button>
      </div>
    </div>
  );
}
