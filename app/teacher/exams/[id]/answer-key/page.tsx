import { updateAnswerKey, updateExamInfo } from "@/lib/actions/teacher";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AnswerKeyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).single();
  const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", id).order("order_no");
  const action = updateAnswerKey.bind(null, id);
  const singles = questions?.filter((q) => q.question_type === "single_choice") ?? [];
  const groups = questions?.filter((q) => q.question_type === "true_false_group") ?? [];
  const shorts = questions?.filter((q) => q.question_type === "short_answer") ?? [];
  const updateInfoAction = updateExamInfo.bind(null, id);
  return (
    <>
      <PageHeader title="Nhập đáp án" description={exam?.title} />
      <form action={updateInfoAction} className="surface mb-6 grid gap-4 p-4">
        <h2 className="font-semibold">Thông tin đề</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-medium">
            Tên đề
            <Input className="mt-1" name="title" defaultValue={exam?.title ?? ""} required />
          </label>
          <label className="text-sm font-medium">
            Khối
            <Input className="mt-1" name="grade" defaultValue={exam?.grade ?? "12"} />
          </label>
          <label className="text-sm font-medium">
            Thời gian
            <Input className="mt-1" name="duration_minutes" type="number" defaultValue={exam?.duration_minutes ?? 90} />
          </label>
          <label className="text-sm font-medium">
            Tổng điểm
            <Input className="mt-1" name="total_score" type="number" step="0.01" defaultValue={exam?.total_score ?? 10} />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr_1fr_auto] md:items-end">
          <label className="text-sm font-medium">
            Trạng thái
            <Select className="mt-1" name="status" defaultValue={exam?.status ?? "draft"}>
              <option value="draft">Bản nháp</option>
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="show_score_after_submit" defaultChecked={Boolean(exam?.show_score_after_submit)} />
            Cho học sinh xem điểm sau khi nộp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="show_answer_after_submit" defaultChecked={Boolean(exam?.show_answer_after_submit)} />
            Cho học sinh xem PDF đáp án sau khi nộp
          </label>
          <Button>Cập nhật đề</Button>
        </div>
      </form>
      <form action={action} className="space-y-6">
        <section className="surface p-4">
          <h2 className="mb-4 font-semibold">Phần I. Trắc nghiệm</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {singles.map((q) => (
              <div key={q.id} className="grid grid-cols-[70px_1fr_90px_1fr] items-center gap-2">
                <span className="font-medium">Câu {q.question_no}</span>
                <Select name={`answer_${q.id}`} defaultValue={q.correct_answer ?? ""}><option value="">-</option><option>A</option><option>B</option><option>C</option><option>D</option></Select>
                <Input name={`score_${q.id}`} type="number" step="0.01" defaultValue={q.score} />
                <Input name={`topic_${q.id}`} placeholder="Topic" defaultValue={q.topic ?? ""} />
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-4">
          <h2 className="mb-4 font-semibold">Phần II. Đúng/Sai</h2>
          {groups.map((group) => (
            <div key={group.id} className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between"><strong>Câu {group.question_no}</strong><span className="text-xs text-slate-500">0 / 0.1 / 0.25 / 0.5 / 1</span></div>
              <div className="grid gap-2 md:grid-cols-2">
                {questions?.filter((q) => q.parent_question_id === group.id).map((item) => (
                  <div key={item.id} className="grid grid-cols-[40px_1fr_1fr] items-center gap-2">
                    <span>{item.sub_label})</span>
                    <Select name={`tf_${item.id}`} defaultValue={item.correct_answer ?? "false"}><option value="true">Đúng</option><option value="false">Sai</option></Select>
                    <Input name={`topic_${item.id}`} placeholder="Topic" defaultValue={item.topic ?? ""} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
        <section className="surface p-4">
          <h2 className="mb-4 font-semibold">Phần III. Trả lời ngắn</h2>
          <div className="grid gap-3">
            {shorts.map((q) => (
              <div key={q.id} className="grid gap-2 md:grid-cols-[80px_1fr_90px_1fr] md:items-center">
                <span className="font-medium">Câu {q.question_no}</span>
                <Input name={`short_${q.id}`} placeholder="Vi du: 1/2; 0.5; 0,5" defaultValue={(q.correct_answers_json ?? []).join("; ")} />
                <Input name={`score_${q.id}`} type="number" step="0.01" defaultValue={q.score} />
                <Input name={`topic_${q.id}`} placeholder="Topic" defaultValue={q.topic ?? ""} />
              </div>
            ))}
          </div>
        </section>
        <Button>Hoàn tất đề</Button>
      </form>
    </>
  );
}
