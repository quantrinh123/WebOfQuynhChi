"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { TakeExamWorkspace } from "@/components/exam/TakeExamWorkspace";

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

export function TakeExamPageClient({
  fileUrl,
  submissionId,
  questions,
  existingAnswers,
  durationMinutes,
  startedAt,
  title,
  description
}: {
  fileUrl?: string | null;
  submissionId: string;
  questions: Question[];
  existingAnswers: ExistingAnswer[];
  durationMinutes: number;
  startedAt: string;
  title: string;
  description?: string;
}) {
  const expiryMs = useMemo(() => new Date(startedAt).getTime() + durationMinutes * 60_000, [startedAt, durationMinutes]);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.round((expiryMs - Date.now()) / 1000)));
  const [autoSubmitTrigger, setAutoSubmitTrigger] = useState(0);
  const hasExpired = useRef(false);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiryMs - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiryMs]);

  useEffect(() => {
    if (secondsLeft === 0 && !hasExpired.current) {
      hasExpired.current = true;
      setAutoSubmitTrigger((value) => value + 1);
    }
  }, [secondsLeft]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#eef4f8]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5 sm:px-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-slate-950">{title}</h1>
            {description ? <p className="text-xs font-semibold text-slate-500">{description}</p> : null}
          </div>
          <ExamTimer secondsLeft={secondsLeft} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-1.5 py-1.5 sm:px-2">
        <TakeExamWorkspace
          fileUrl={fileUrl}
          submissionId={submissionId}
          questions={questions}
          existingAnswers={existingAnswers}
          autoSubmitTrigger={autoSubmitTrigger}
        />
      </main>
    </div>
  );
}
