import { deleteExam, setExamStatus, updateExamInfo } from "@/lib/actions/teacher";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Input } from "@/components/ui/input";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function ExamSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).eq("teacher_id", teacher.id).single();

  return (
    <div className="grid max-w-4xl gap-5">
      <ActionForm action={updateExamInfo.bind(null, id)} className="surface grid gap-4 p-5">
        <h2 className="font-semibold">Thông tin đề</h2>
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="text-sm font-medium">
            Tên đề
            <Input className="mt-1" name="title" defaultValue={exam?.title ?? ""} required />
          </label>
          <label className="text-sm font-medium">
            Khối
            <Input className="mt-1" name="grade" defaultValue={exam?.grade ?? "12"} />
          </label>
          <label className="text-sm font-medium">
            Thời gian (phút)
            <Input className="mt-1" name="duration_minutes" type="number" min={1} defaultValue={exam?.duration_minutes ?? 90} />
          </label>
          <label className="text-sm font-medium">
            Tổng điểm
            <Input className="mt-1" name="total_score" type="number" step="0.01" defaultValue={exam?.total_score ?? 10} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="show_score_after_submit" defaultChecked={Boolean(exam?.show_score_after_submit)} />
          Cho học sinh xem điểm và bảng xếp hạng sau khi nộp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="show_answer_after_submit" defaultChecked={Boolean(exam?.show_answer_after_submit)} />
          Cho học sinh xem PDF đáp án sau khi nộp
        </label>
        <SubmitButton className="w-fit">Lưu thông tin</SubmitButton>
      </ActionForm>

      <section className="surface grid gap-3 p-5">
        <h2 className="font-semibold">Trạng thái đề</h2>
        <p className="text-sm text-slate-600">
          {exam?.status === "open"
            ? "Đề đang mở: học sinh trong các lớp được giao có thể làm bài (trong khung giờ giao)."
            : exam?.status === "closed"
              ? "Đề đã đóng: học sinh không thể bắt đầu hay tiếp tục làm bài. Bài đang làm dở sẽ được chấm với các đáp án đã lưu."
              : "Đề đang là bản nháp: học sinh chưa nhìn thấy đề."}
        </p>
        <div className="flex flex-wrap gap-2">
          {exam?.status !== "open" ? (
            <ActionForm action={setExamStatus.bind(null, id, "open")}>
              <SubmitButton pendingText="Đang mở...">{exam?.status === "closed" ? "Mở lại đề" : "Mở đề"}</SubmitButton>
            </ActionForm>
          ) : null}
          {exam?.status === "open" ? (
            <ActionForm action={setExamStatus.bind(null, id, "closed")}>
              <SubmitButton variant="secondary" pendingText="Đang đóng..." confirmMessage="Đóng đề? Học sinh đang làm sẽ bị dừng và chấm theo đáp án đã lưu.">
                Đóng đề
              </SubmitButton>
            </ActionForm>
          ) : null}
          {exam?.status !== "draft" ? (
            <ActionForm action={setExamStatus.bind(null, id, "draft")}>
              <SubmitButton variant="secondary" confirmMessage="Chuyển đề về bản nháp? Học sinh sẽ không thấy đề nữa.">
                Chuyển về bản nháp
              </SubmitButton>
            </ActionForm>
          ) : null}
        </div>
      </section>

      <section className="surface grid gap-3 border-rose-200 p-5">
        <h2 className="font-semibold text-rose-700">Xoá đề</h2>
        <p className="text-sm text-slate-600">Xoá vĩnh viễn câu hỏi, lịch giao đề, toàn bộ bài nộp và file PDF của đề này. Không thể hoàn tác.</p>
        <form action={deleteExam.bind(null, id)}>
          <ConfirmSubmitButton message={`Xoá đề ${exam?.title ?? ""}? Toàn bộ bài nộp và file PDF sẽ bị xoá vĩnh viễn.`}>Xoá đề</ConfirmSubmitButton>
        </form>
      </section>
    </div>
  );
}
