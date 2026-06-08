"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { finalizeExamCreation, prepareExamCreation } from "@/lib/actions/teacher";

type FormState = "idle" | "creating" | "uploading" | "finalizing" | "error";

export function CreateExamForm() {
  const router = useRouter();
  const [examId] = useState(() => crypto.randomUUID());
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      className="surface grid max-w-3xl gap-4 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setErrorMessage(null);
        setState("creating");

        const form = event.currentTarget;
        const formData = new FormData(form);
        formData.set("exam_id", examId);
        formData.delete("question_pdf");
        formData.delete("answer_pdf");

        const questionFile = (form.elements.namedItem("question_pdf") as HTMLInputElement | null)?.files?.[0] ?? null;
        const answerFile = (form.elements.namedItem("answer_pdf") as HTMLInputElement | null)?.files?.[0] ?? null;

        if (!questionFile) {
          setState("error");
          setErrorMessage("Bạn cần chọn file PDF đề thi.");
          return;
        }

        try {
          const draft = await prepareExamCreation(formData);
          const supabase = createClient();

          setState("uploading");
          const uploads = [
            supabase.storage.from("exam-pdfs").uploadToSignedUrl(draft.questionUpload.path, draft.questionUpload.token, questionFile, {
              contentType: questionFile.type || "application/pdf"
            }),
            answerFile
              ? supabase.storage.from("exam-pdfs").uploadToSignedUrl(draft.answerUpload.path, draft.answerUpload.token, answerFile, {
                  contentType: answerFile.type || "application/pdf"
                })
              : Promise.resolve({ error: null })
          ];

          const [questionResult, answerResult] = await Promise.all(uploads);
          if (questionResult.error) throw questionResult.error;
          if (answerResult.error) throw answerResult.error;

          setState("finalizing");
          const result = await finalizeExamCreation(draft.examId, {
            questionPdfPath: draft.questionUpload.path,
            answerPdfPath: answerFile ? draft.answerUpload.path : null
          });
          router.push(result.redirectTo);
          router.refresh();
        } catch (error) {
          setState("error");
          setErrorMessage(error instanceof Error ? error.message : "Không tạo được đề thi.");
        }
      }}
    >
      <input type="hidden" name="exam_id" value={examId} />

      <label className="text-sm font-medium">
        Tên đề
        <Input className="mt-1" name="title" required />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          Khối
          <Input className="mt-1" name="grade" defaultValue="12" />
        </label>
        <label className="text-sm font-medium">
          Thời gian
          <Input className="mt-1" name="duration_minutes" type="number" defaultValue="90" />
        </label>
        <label className="text-sm font-medium">
          Tổng điểm
          <Input className="mt-1" name="total_score" type="number" step="0.01" defaultValue="10" />
        </label>
      </div>
      <label className="text-sm font-medium">
        File đề thi PDF
        <Input className="mt-1" name="question_pdf" type="file" accept="application/pdf" required />
      </label>
      <label className="text-sm font-medium">
        File đáp án PDF
        <Input className="mt-1" name="answer_pdf" type="file" accept="application/pdf" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="show_score_after_submit" defaultChecked />
        Cho học sinh xem điểm sau khi nộp
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="show_answer_after_submit" />
        Cho học sinh xem PDF đáp án sau khi nộp
      </label>

      {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}

      <Button className="w-fit gap-2" type="submit" disabled={state !== "idle" && state !== "error"}>
        {state === "creating" || state === "uploading" || state === "finalizing" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {state === "creating" ? "Đang tạo bản nháp" : state === "uploading" ? "Đang upload PDF" : state === "finalizing" ? "Đang hoàn tất" : "Tạo đề và nhập đáp án"}
      </Button>
    </form>
  );
}
