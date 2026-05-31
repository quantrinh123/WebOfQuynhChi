import { redirect } from "next/navigation";
import { AnswerSheet } from "@/components/exam/AnswerSheet";
import { PdfViewer } from "@/components/exam/PdfViewer";
import { PageHeader } from "@/components/layout/PageHeader";
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
  const { data: questions } = await supabase.from("exam_questions").select("id,parent_question_id,question_no,sub_label,question_type").eq("exam_id", id).order("order_no");
  const { data: answers } = await supabase.from("submission_answers").select("*").eq("submission_id", submission.id);
  const { data: signed } = exam?.question_pdf_path
    ? await supabase.storage.from("exam-pdfs").createSignedUrl(exam.question_pdf_path, 60 * 60)
    : { data: null };
  return (
    <>
      <PageHeader title="Làm bài" description={`${exam?.title} - ${exam?.duration_minutes} phút`} />
      <div className="h-[calc(100vh-190px)] min-h-[640px] overflow-hidden lg:grid lg:grid-cols-[minmax(760px,1fr)_430px] lg:gap-4">
        <div className="hidden min-h-0 overflow-hidden lg:block">
          <PdfViewer fileUrl={signed?.signedUrl} height="100%" className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="lg:hidden"><details className="surface mb-4 p-3"><summary className="font-semibold">Đề thi PDF</summary><div className="mt-3"><PdfViewer fileUrl={signed?.signedUrl} height={520} /></div></details></div>
        <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
          <AnswerSheet submissionId={submission.id} questions={questions ?? []} existingAnswers={answers ?? []} />
        </div>
      </div>
    </>
  );
}
