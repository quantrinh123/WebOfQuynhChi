"use client";

import { useState } from "react";
import { Columns2, FileText, ListChecks } from "lucide-react";
import { AnswerSheet } from "@/components/exam/AnswerSheet";
import { PdfViewer } from "@/components/exam/PdfViewer";
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

type LayoutMode = "question" | "balanced" | "answer";

const modes: Array<{ value: LayoutMode; label: string; icon: React.ElementType; grid: string }> = [
  { value: "question", label: "Đề rộng", icon: FileText, grid: "lg:grid-cols-[minmax(0,1fr)_420px]" },
  { value: "balanced", label: "Chia đôi", icon: Columns2, grid: "lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.72fr)]" },
  { value: "answer", label: "Đáp án rộng", icon: ListChecks, grid: "lg:grid-cols-[minmax(0,0.78fr)_minmax(520px,1fr)]" }
];

export function TakeExamWorkspace({
  fileUrl,
  submissionId,
  questions,
  existingAnswers,
  autoSubmitTrigger
}: {
  fileUrl?: string | null;
  submissionId: string;
  questions: Question[];
  existingAnswers: ExistingAnswer[];
  autoSubmitTrigger?: number;
}) {
  const [mode, setMode] = useState<LayoutMode>("question");
  const current = modes.find((item) => item.value === mode) ?? modes[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold transition",
                  active ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="hidden text-xs font-medium text-slate-500 md:block">Chọn bố cục dễ nhìn nhất khi làm bài.</p>
      </div>

      <div className={cn("h-[calc(100vh-160px)] min-h-[650px] overflow-hidden lg:grid lg:gap-4", current.grid)}>
        <section className="hidden min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <PdfViewer fileUrl={fileUrl} height="100%" className="h-full w-full border-0 bg-white" />
        </section>

        <section className="lg:hidden">
          <details className="surface mb-4 p-3">
            <summary className="font-semibold">Đề thi PDF</summary>
            <div className="mt-3">
              <PdfViewer fileUrl={fileUrl} height={520} />
            </div>
          </details>
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <AnswerSheet submissionId={submissionId} questions={questions} existingAnswers={existingAnswers} autoSubmitTrigger={autoSubmitTrigger} />
        </section>
      </div>
    </div>
  );
}
