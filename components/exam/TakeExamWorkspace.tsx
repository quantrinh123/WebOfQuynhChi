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
  { value: "question", label: "Đề rộng", icon: FileText, grid: "lg:grid-cols-[minmax(0,1fr)_390px]" },
  { value: "balanced", label: "Chia đôi", icon: Columns2, grid: "lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.72fr)]" },
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
  const [mobilePane, setMobilePane] = useState<"question" | "answer">("question");
  const current = modes.find((item) => item.value === mode) ?? modes[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      {/* Điện thoại: chuyển qua lại giữa đề và phiếu trả lời, mỗi bên chiếm trọn màn hình. */}
      <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm lg:hidden">
        {[
          { value: "question" as const, label: "Đề thi", icon: FileText },
          { value: "answer" as const, label: "Phiếu trả lời", icon: ListChecks }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMobilePane(item.value)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-bold transition",
              mobilePane === item.value ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="hidden shrink-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm lg:flex">
        <div className="flex flex-wrap gap-1">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-bold transition",
                  active ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
        <span className="pr-1 text-xs font-semibold text-slate-500">Bố cục</span>
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col lg:grid lg:gap-2", current.grid)}>
        <section
          className={cn(
            "min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:flex",
            mobilePane === "question" ? "flex" : "hidden"
          )}
        >
          <PdfViewer fileUrl={fileUrl} height="100%" className="h-full w-full border-0 bg-white" />
        </section>

        <section
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm lg:flex",
            mobilePane === "answer" ? "flex" : "hidden"
          )}
        >
          <AnswerSheet submissionId={submissionId} questions={questions} existingAnswers={existingAnswers} autoSubmitTrigger={autoSubmitTrigger} />
        </section>
      </div>
    </div>
  );
}
