import { createExamWithPdfs } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireTeacher } from "@/lib/auth";

export default async function CreateExamPage() {
  await requireTeacher();
  return (
    <>
      <PageHeader title="Tạo đề Toán THPT 2025" description="Upload riêng đề thi PDF và đáp án PDF." />
      <form action={createExamWithPdfs} className="surface grid max-w-3xl gap-4 p-5">
        <label className="text-sm font-medium">Tên đề<Input className="mt-1" name="title" required /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Khối<Input className="mt-1" name="grade" defaultValue="12" /></label>
          <label className="text-sm font-medium">Thời gian<Input className="mt-1" name="duration_minutes" type="number" defaultValue="90" /></label>
          <label className="text-sm font-medium">Tổng điểm<Input className="mt-1" name="total_score" type="number" step="0.01" defaultValue="10" /></label>
        </div>
        <label className="text-sm font-medium">File đề thi PDF<Input className="mt-1" name="question_pdf" type="file" accept="application/pdf" required /></label>
        <label className="text-sm font-medium">File đáp án PDF<Input className="mt-1" name="answer_pdf" type="file" accept="application/pdf" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_score_after_submit" defaultChecked /> Cho học sinh xem điểm sau khi nộp</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_answer_after_submit" /> Cho học sinh xem PDF đáp án sau khi nộp</label>
        <Button className="w-fit">Tạo đề và nhập đáp án</Button>
      </form>
    </>
  );
}
