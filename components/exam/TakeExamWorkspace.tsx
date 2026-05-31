"use client";

import { useEffect, useRef, useState } from "react";
import { Columns2, FileText, GripVertical, ListChecks } from "lucide-react";
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

const modes: Array<{ value: LayoutMode; label: string; icon: React.ElementType; percent: number }> = [
  { value: "balanced", label: "Chia đôi", icon: Columns2, percent: 58 },
  { value: "question", label: "Mở rộng đề", icon: FileText, percent: 72 },
  { value: "answer", label: "Mở rộng đáp án", icon: ListChecks, percent: 42 }
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<LayoutMode>("question");
  const [questionWidth, setQuestionWidth] = useState(72);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;

    function handlePointerMove(event: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(78, Math.max(35, next));
      setQuestionWidth(clamped);
      setMode("balanced");
    }

    function stopDragging() {
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [dragging]);

  function setPreset(nextMode: LayoutMode, percent: number) {
    setMode(nextMode);
    setQuestionWidth(percent);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {modes.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value && Math.abs(questionWidth - item.percent) < 1;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setPreset(item.value, item.percent)}
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
        <p className="text-xs font-medium text-slate-500">Kéo thanh ở giữa để tự chỉnh độ rộng đề và phần đáp án.</p>
      </div>

      <div
        ref={containerRef}
        className={cn("h-[calc(100vh-235px)] min-h-[640px] overflow-hidden lg:grid", dragging && "select-none")}
        style={{ gridTemplateColumns: `${questionWidth}% 14px minmax(360px, 1fr)` }}
      >
        <div className="hidden min-h-0 overflow-hidden lg:block">
          <PdfViewer fileUrl={fileUrl} height="100%" className="h-full w-full rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>

        <button
          type="button"
          className={cn(
            "hidden h-full cursor-col-resize items-center justify-center text-slate-400 transition hover:text-teal-700 lg:flex",
            dragging && "text-teal-700"
          )}
          onPointerDown={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          title="Kéo để đổi độ rộng"
        >
          <span className="flex h-20 w-3 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <GripVertical size={16} />
          </span>
        </button>

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
