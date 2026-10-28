import { PageHeader } from "@/components/layout/PageHeader";
import { CreateExamForm } from "@/components/exam/CreateExamForm";
import { requireTeacher } from "@/lib/auth";

export default async function CreateExamPage() {
  await requireTeacher();
  return (
    <>
      <PageHeader title="Tạo đề Toán" description="Chọn dạng đề, upload riêng đề thi PDF và đáp án PDF." />
      <CreateExamForm />
    </>
  );
}
