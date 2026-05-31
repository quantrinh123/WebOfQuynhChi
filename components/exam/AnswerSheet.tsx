"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswer, submitExam } from "@/lib/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/format";

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

export function AnswerSheet({
  submissionId,
  questions,
  existingAnswers,
  autoSubmitTrigger
}: {
  submissionId: string;
  questions: Question[];
  existingAnswers: ExistingAnswer[];
  autoSubmitTrigger?: number;
}) {
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
  const prevAutoSubmit = useRef(0);
  const singles = questions.filter((q) => q.question_type === "single_choice");
  const groups = questions.filter((q) => q.question_type === "true_false_group");
  const shorts = questions.filter((q) => q.question_type === "short_answer");
  const answerable = questions.filter((q) => q.question_type !== "true_false_group");
  const answeredCount = answerable.filter((q) => answers[q.id]).length;

  function update(question: Question, value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    startTransition(() => {
      if (question.question_type === "single_choice") void saveAnswer(submissionId, question.id, { selected_option: value });
      if (question.question_type === "true_false_item") void saveAnswer(submissionId, question.id, { boolean_answer: value === "true" });
      if (question.question_type === "short_answer") void saveAnswer(submissionId, question.id, { answer_text: value });
    });
  }

  function submit(confirmMissing = true) {
    const missing = answerable.filter((q) => !answers[q.id]).length;
    if (missing && confirmMissing && !window.confirm(`Bạn còn ${missing} câu chưa trả lời. Bạn có chắc muốn nộp không?`)) return;
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

  useEffect(() => {
    if (!autoSubmitTrigger) return;
    if (prevAutoSubmit.current === autoSubmitTrigger) return;
    prevAutoSubmit.current = autoSubmitTrigger;
    submit(false);
  }, [autoSubmitTrigger]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Phiếu trả lời</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Đã làm {answeredCount}/{answerable.length} câu
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 ring-1 ring-teal-100">{pending ? "Đang lưu" : "Đã sẵn sàng"}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <SectionTitle title="Phần I" subtitle="Trắc nghiệm" />
        <div className="grid gap-3">
          {singles.map((q) => (
            <QuestionCard key={q.id} title={`Câu ${q.question_no}`}>
              <div className="grid grid-cols-4 gap-2">
                {["A", "B", "C", "D"].map((option) => (
                  <ChoiceOption key={option} checked={answers[q.id] === option} name={q.id} label={option} onChange={() => update(q, option)} />
                ))}
              </div>
            </QuestionCard>
          ))}
        </div>

        <SectionTitle title="Phần II" subtitle="Đúng/Sai" />
        <div className="grid gap-3">
          {groups.map((group) => (
            <QuestionCard key={group.id} title={`Câu ${group.question_no}`}>
              <div className="grid gap-2">
                {questions
                  .filter((q) => q.parent_question_id === group.id)
                  .map((item) => (
                    <div key={item.id} className="grid grid-cols-[30px_1fr_1fr] items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{item.sub_label})</span>
                      <ChoiceOption checked={answers[item.id] === "true"} name={item.id} label="Đúng" onChange={() => update(item, "true")} />
                      <ChoiceOption checked={answers[item.id] === "false"} name={item.id} label="Sai" onChange={() => update(item, "false")} />
                    </div>
                  ))}
              </div>
            </QuestionCard>
          ))}
        </div>

        <SectionTitle title="Phần III" subtitle="Trả lời ngắn" />
        <div className="grid gap-3">
          {shorts.map((q) => (
            <QuestionCard key={q.id} title={`Câu ${q.question_no}`}>
              <Input value={answers[q.id] ?? ""} onChange={(event) => update(q, event.target.value)} placeholder="Nhập đáp án" />
            </QuestionCard>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-4 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
        <Button variant="secondary" disabled={pending} className="min-w-28">
          Lưu tạm
        </Button>
        <Button type="button" onClick={() => submit()} disabled={pending} className="min-w-32">
          {pending ? "Đang xử lý..." : "Nộp bài"}
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-end justify-between border-b border-slate-200 pb-2">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
      <span className="text-xs font-semibold text-slate-500">{subtitle}</span>
    </div>
  );
}

function QuestionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-3 text-sm font-black text-slate-950">{title}</p>
      {children}
    </div>
  );
}

function ChoiceOption({ checked, label, name, onChange }: { checked: boolean; label: string; name: string; onChange: () => void }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition",
        checked ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
