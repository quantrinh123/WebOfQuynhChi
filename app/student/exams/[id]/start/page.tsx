import { startSubmission } from "@/lib/actions/student";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { requireStudent } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function StartExamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const action = startSubmission.bind(null, id);
  return (
    <>
      <PageHeader title="Xác nhận làm bài" description={exam?.title} />
      <div className="surface max-w-xl p-5">
        <p className="text-sm text-slate-600">Thời gian: {exam?.duration_minutes} phút</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          <li>Phần I: 12 câu trắc nghiệm</li>
          <li>Phần II: 4 câu đúng/sai, mỗi câu có 4 ý</li>
          <li>Phần III: 6 câu trả lời ngắn</li>
        </ul>
        <form action={action} className="mt-5"><Button>Bắt đầu làm bài</Button></form>
      </div>
    </>
  );
}
