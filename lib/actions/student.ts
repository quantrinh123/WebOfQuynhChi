"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { gradeSubmission } from "@/lib/grading";
import { createServiceClient } from "@/lib/supabase/server";

type SubmissionWithExam = {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string | null;
  submitted_at: string | null;
  status: string;
  exams: { duration_minutes: number | null } | null;
};

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
  const student = await requireStudent();
  const supabase = createServiceClient();
  const submission = await getStudentSubmission(supabase, submissionId, student.id);

  if (!submission || submission.status !== "doing") return;
  if (isSubmissionExpired(submission)) {
    await finalizeSubmission(supabase, submission.id);
    return;
  }

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
  const student = await requireStudent();
  const supabase = createServiceClient();
  const submission = await getStudentSubmission(supabase, submissionId, student.id);
  if (!submission) throw new Error("Không tìm thấy bài nộp.");

  if (submission.status === "graded") redirect(`/student/exams/${submission.exam_id}/result`);

  if (!isSubmissionExpired(submission)) {
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
  }

  await finalizeSubmission(supabase, submissionId);
  redirect(`/student/exams/${submission.exam_id}/result`);
}

export async function finalizeExpiredSubmission(submissionId: string) {
  const student = await requireStudent();
  const supabase = createServiceClient();
  const submission = await getStudentSubmission(supabase, submissionId, student.id);
  if (!submission) throw new Error("Không tìm thấy bài nộp.");

  if (submission.status === "doing" && isSubmissionExpired(submission)) {
    await finalizeSubmission(supabase, submission.id);
  }

  redirect(`/student/exams/${submission.exam_id}/result`);
}

async function getStudentSubmission(supabase: ReturnType<typeof createServiceClient>, submissionId: string, studentId: string) {
  const { data } = await supabase
    .from("submissions")
    .select("id, exam_id, student_id, started_at, submitted_at, status, exams(duration_minutes)")
    .eq("id", submissionId)
    .eq("student_id", studentId)
    .maybeSingle();

  return data as SubmissionWithExam | null;
}

function isSubmissionExpired(submission: SubmissionWithExam) {
  const startedAt = submission.started_at ? new Date(submission.started_at).getTime() : Date.now();
  const durationMinutes = Number(submission.exams?.duration_minutes ?? 0);
  if (!durationMinutes) return false;
  return Date.now() >= startedAt + durationMinutes * 60_000;
}

async function finalizeSubmission(supabase: ReturnType<typeof createServiceClient>, submissionId: string) {
  const submittedAt = new Date().toISOString();
  await supabase.from("submissions").update({ submitted_at: submittedAt, status: "submitted" }).eq("id", submissionId).neq("status", "graded");
  await gradeSubmission(submissionId);
}
