import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { getExamSetupSteps } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";

// Mở đề: đưa giáo viên tới bước còn dang dở, hoặc tới kết quả nếu đề đã sẵn sàng.
export default async function ExamHubPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const [{ data: exam }, { data: questions }, { count }] = await Promise.all([
    supabase.from("exams").select("status").eq("id", id).maybeSingle(),
    supabase.from("exam_questions").select("question_type, correct_answer, correct_answers_json").eq("exam_id", id),
    supabase.from("exam_assignments").select("id", { count: "exact", head: true }).eq("exam_id", id)
  ]);
  const steps = getExamSetupSteps({ questions: questions ?? [], assignmentCount: count ?? 0, status: exam?.status ?? "draft" });
  if (!steps.answerKeyDone) redirect(`/teacher/exams/${id}/answer-key`);
  if (!steps.assigned || !steps.opened) redirect(`/teacher/exams/${id}/assign`);
  redirect(`/teacher/exams/${id}/results`);
}
