import { assignExamToClass } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AssignExamPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: classes } = await supabase.from("classes").select("*").eq("teacher_id", teacher.id);
  const action = assignExamToClass.bind(null, id);
  return (
    <>
      <PageHeader title="Giao đề" />
      <form action={action} className="surface grid max-w-xl gap-4 p-5">
        <label className="text-sm font-medium">Lớp<Select className="mt-1" name="class_id" required>{classes?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label>
        <label className="text-sm font-medium">Bắt đầu<Input className="mt-1" name="start_time" type="datetime-local" /></label>
        <label className="text-sm font-medium">Kết thúc<Input className="mt-1" name="end_time" type="datetime-local" /></label>
        <Button>Giao đề</Button>
      </form>
    </>
  );
}
