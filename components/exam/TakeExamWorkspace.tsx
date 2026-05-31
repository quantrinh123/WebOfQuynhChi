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

type LayoutMode = "balanced" | "question" | "answer";

const modes: Array<{ value: LayoutMode; label: string; icon: React.ElementType }> = [
  { value: "balanced", label: "Chia đôi", icon: Columns2 },
  { value: "question", label: "Mở rộng đề", icon: FileText },
  { value: "answer", label: "Mở rộng đáp án", icon: ListChecks }
];

export function TakeExamWorkspace({
  fileUrl,
  submissionId,
  questions,
  existingAnswers
}: {
  fileUrl?: string | null;
  submissionId: string;
  questions: Question[];
  existingAnswers: ExistingAnswer[];
}) {
  const [mode, setMode] = useState<LayoutMode>("question");
  const gridClass =
    mode === "question"
      ? "lg:grid-cols-[minmax(720px,1fr)_390px]"
      : mode === "answer"
        ? "lg:grid-cols-[minmax(520px,0.78fr)_minmax(520px,1.22fr)]"
        : "lg:grid-cols-[minmax(620px,1fr)_minmax(460px,0.95fr)]";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition",
                  active ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-medium text-slate-500">Có thể đổi bố cục bất cứ lúc nào khi đang làm bài.</p>
      </div>

      <div className={cn("h-[calc(100vh-235px)] min-h-[640px] overflow-hidden lg:grid lg:gap-4", gridClass)}>
        <div className="hidden min-h-0 overflow-hidden lg:block">
          <PdfViewer fileUrl={fileUrl} height="100%" className="h-full w-full rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="lg:hidden">
          <details className="surface mb-4 p-3">
            <summary className="font-semibold">Đề thi PDF</summary>
            <div className="mt-3">
              <PdfViewer fileUrl={fileUrl} height={520} />
            </div>
          </details>
        </div>
        <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <AnswerSheet submissionId={submissionId} questions={questions} existingAnswers={existingAnswers} />
        </div>
      </div>
    </div>
  );
}
