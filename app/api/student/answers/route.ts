import { NextResponse } from "next/server";
import { gradeSubmission } from "@/lib/grading";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type SubmissionWithExam = {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string | null;
  status: string;
  exams: { duration_minutes: number | null } | null;
};

type SaveAnswerBody = {
  submissionId?: string;
  questionId?: string;
  selected_option?: string | null;
  boolean_answer?: boolean | null;
  answer_text?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { data: profile } = await serviceSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "student") {
    return NextResponse.json({ error: "Không có quyền lưu bài làm" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SaveAnswerBody | null;
  if (!body?.submissionId || !body?.questionId) {
    return NextResponse.json({ error: "Thiếu dữ liệu đáp án" }, { status: 400 });
  }

  const submission = await getStudentSubmission(serviceSupabase, body.submissionId, user.id);
  if (!submission) {
    return NextResponse.json({ error: "Không tìm thấy bài làm" }, { status: 404 });
  }

  if (submission.status !== "doing") {
    return NextResponse.json({ ok: false, status: submission.status });
  }

  if (isSubmissionExpired(submission)) {
    await finalizeSubmission(serviceSupabase, submission.id);
    return NextResponse.json({ ok: false, expired: true, examId: submission.exam_id });
  }

  const { error } = await serviceSupabase.from("submission_answers").upsert(
    {
      submission_id: body.submissionId,
      question_id: body.questionId,
      selected_option: body.selected_option ?? null,
      boolean_answer: body.boolean_answer ?? null,
      answer_text: body.answer_text ?? null
    },
    { onConflict: "submission_id,question_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Không lưu được đáp án" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function getStudentSubmission(supabase: ReturnType<typeof createServiceClient>, submissionId: string, studentId: string) {
  const { data } = await supabase
    .from("submissions")
    .select("id, exam_id, student_id, started_at, status, exams(duration_minutes)")
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
