"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { gradeSubmission } from "@/lib/grading";
import { createServiceClient } from "@/lib/supabase/server";

export async function startSubmission(examId: string) {
  const student = await requireStudent();
  const supabase = createServiceClient();
  await supabase.from("submissions").upsert({ exam_id: examId, student_id: student.id, status: "doing" }, { onConflict: "exam_id,student_id" });
  redirect(`/student/exams/${examId}/take`);
}

export async function retakeExam(examId: string) {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("exam_id", examId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("submissions").delete().eq("id", existing.id);
  }

  await supabase.from("submissions").insert({ exam_id: examId, student_id: student.id, status: "doing" });
  redirect(`/student/exams/${examId}/take`);
}

export async function saveAnswer(submissionId: string, questionId: string, payload: { selected_option?: string; boolean_answer?: boolean; answer_text?: string }) {
  await requireStudent();
  const supabase = createServiceClient();
  await supabase.from("submission_answers").upsert(
    {
      submission_id: submissionId,
      question_id: questionId,
      selected_option: payload.selected_option ?? null,
      boolean_answer: payload.boolean_answer ?? null,
      answer_text: payload.answer_text ?? null
    },
    { onConflict: "submission_id,question_id" }
  );
  revalidatePath(`/student/exams`);
}

export async function submitExam(submissionId: string, answers: Array<{ questionId: string; selected_option?: string; boolean_answer?: boolean; answer_text?: string }>) {
  await requireStudent();
  const supabase = createServiceClient();
  for (const answer of answers) {
    await supabase.from("submission_answers").upsert(
      {
        submission_id: submissionId,
        question_id: answer.questionId,
        selected_option: answer.selected_option ?? null,
        boolean_answer: answer.boolean_answer ?? null,
        answer_text: answer.answer_text ?? null
      },
      { onConflict: "submission_id,question_id" }
    );
  }
  await supabase.from("submissions").update({ submitted_at: new Date().toISOString(), status: "submitted" }).eq("id", submissionId);
  const { data: submission } = await supabase.from("submissions").select("exam_id").eq("id", submissionId).single();
  if (!submission) throw new Error("Không tìm thấy bài nộp.");
  await gradeSubmission(submissionId);
  redirect(`/student/exams/${submission.exam_id}/result`);
}
