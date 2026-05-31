import { redirect } from "next/navigation";
import { TakeExamPageClient } from "@/components/exam/TakeExamPageClient";
import { finalizeExpiredSubmission } from "@/lib/actions/student";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const { data: submission } = await supabase.from("submissions").select("*").eq("exam_id", id).eq("student_id", student.id).single();

  if (!submission) redirect(`/student/exams/${id}/start`);
  if (submission.status === "graded") redirect(`/student/exams/${id}/result`);

  const startedAt = submission.started_at ? new Date(submission.started_at).getTime() : Date.now();
  const durationMinutes = Number(exam?.duration_minutes ?? 0);
  if (submission.status === "doing" && durationMinutes > 0 && Date.now() >= startedAt + durationMinutes * 60_000) {
    await finalizeExpiredSubmission(submission.id);
  }

  const { data: questions } = await supabase
    .from("exam_questions")
    .select("id,parent_question_id,question_no,sub_label,question_type")
    .eq("exam_id", id)
    .order("order_no");
  const { data: answers } = await supabase.from("submission_answers").select("*").eq("submission_id", submission.id);
  const { data: signed } = exam?.question_pdf_path ? await supabase.storage.from("exam-pdfs").createSignedUrl(exam.question_pdf_path, 60 * 60) : { data: null };

  return (
    <TakeExamPageClient
      title="Làm bài"
      description={`${exam?.title} - ${exam?.duration_minutes} phút`}
      fileUrl={signed?.signedUrl}
      submissionId={submission.id}
      questions={questions ?? []}
      existingAnswers={answers ?? []}
      durationMinutes={exam?.duration_minutes ?? 90}
      startedAt={submission.started_at ?? new Date().toISOString()}
    />
  );
}
