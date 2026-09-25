"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, LogOut, Save } from "lucide-react";
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
  deadlineAt,
  title,
  description
}: {
  fileUrl?: string | null;
  submissionId: string;
  questions: Question[];
  existingAnswers: ExistingAnswer[];
  deadlineAt: string | null;
  title: string;
  description?: string;
}) {
  const expiryMs = useMemo(() => (deadlineAt ? new Date(deadlineAt).getTime() : Number.POSITIVE_INFINITY), [deadlineAt]);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.round((expiryMs - Date.now()) / 1000)));
  const [autoSubmitTrigger, setAutoSubmitTrigger] = useState(0);
  const [sessionWarning, setSessionWarning] = useState(false);
  const hasExpired = useRef(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!confirmExit) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setConfirmExit(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmExit]);

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

  useEffect(() => {
    async function pingSession() {
      if (Date.now() >= expiryMs) return;
      try {
        const response = await fetch("/api/auth/ping", { cache: "no-store" });
        setSessionWarning(!response.ok);
      } catch {
        setSessionWarning(true);
      }
    }

    void pingSession();
    const timer = window.setInterval(() => void pingSession(), 120_000);
    return () => window.clearInterval(timer);
  }, [expiryMs]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#eef4f8]">
      <header className="z-30 shrink-0 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5 sm:px-3">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            title="Thoát bài thi"
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">Thoát</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-slate-950">{title}</h1>
            {description ? <p className="text-xs font-semibold text-slate-500">{description}</p> : null}
            {sessionWarning ? <p className="mt-0.5 text-xs font-bold text-rose-600">Phiên đăng nhập đang gián đoạn. Đáp án đã lưu vẫn được giữ, hãy kiểm tra mạng hoặc tải lại trang.</p> : null}
          </div>
          <ExamTimer secondsLeft={secondsLeft} />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 py-1.5 sm:px-2">
        <TakeExamWorkspace
          fileUrl={fileUrl}
          submissionId={submissionId}
          questions={questions}
          existingAnswers={existingAnswers}
          autoSubmitTrigger={autoSubmitTrigger}
        />
      </main>

      {confirmExit ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center" onClick={() => setConfirmExit(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            className="animate-rise-in w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <LogOut size={22} />
            </span>
            <h2 id="exit-title" className="mt-4 text-xl font-black text-slate-950">Thoát bài thi?</h2>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Save size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                Các đáp án bạn đã chọn đều đã được lưu.
              </li>
              <li className="flex items-start gap-2">
                <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-600" />
                Đồng hồ <strong className="text-slate-900">vẫn tiếp tục chạy</strong>. Hết giờ bài sẽ tự nộp.
              </li>
            </ul>
            <p className="mt-3 text-sm text-slate-600">Bạn có thể quay lại làm tiếp bằng nút &quot;Làm tiếp&quot; ở danh sách bài thi.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmExit(false)}
                className="h-11 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)]"
              >
                Ở lại làm bài
              </button>
              <button
                type="button"
                onClick={() => router.push("/student/exams")}
                className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
