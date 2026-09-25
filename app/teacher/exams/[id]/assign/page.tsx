import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { saveExamAssignments } from "@/lib/actions/teacher";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { requireTeacher } from "@/lib/auth";
import { countMissingAnswers } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { toDateTimeInputValue } from "@/lib/utils/format";

export default async function AssignExamPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const [{ data: exam }, { data: classes }, { data: assignments }, { data: questions }] = await Promise.all([
    supabase.from("exams").select("status").eq("id", id).single(),
    supabase.from("classes").select("id, name, class_students(count)").eq("teacher_id", teacher.id).order("name"),
    supabase.from("exam_assignments").select("class_id, start_time, end_time").eq("exam_id", id),
    supabase.from("exam_questions").select("question_type, correct_answer, correct_answers_json").eq("exam_id", id)
  ]);
  const assignmentByClass = new Map((assignments ?? []).map((item) => [item.class_id, item]));
  const missing = countMissingAnswers(questions ?? []);

  if (!classes?.length) {
    return (
      <EmptyState
        title="Bạn chưa có lớp nào"
        description="Tạo lớp và thêm học sinh ở mục Lớp học trước, sau đó quay lại đây để giao đề."
      />
    );
  }

  return (
    <ActionForm action={saveExamAssignments.bind(null, id)} className="grid max-w-4xl gap-5">
      {missing ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Đề còn <strong>{missing}</strong> câu/ý chưa có đáp án nên chưa thể mở cho học sinh. Bạn vẫn có thể lưu lịch giao trước.{" "}
            <Link href={`/teacher/exams/${id}/answer-key`} className="font-bold underline">Nhập đáp án</Link>
          </p>
        </div>
      ) : null}

      <section className="table-shell">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold">Chọn lớp được làm đề</h2>
          <p className="mt-1 text-sm text-slate-600">
            Để trống giờ bắt đầu = làm được ngay khi đề mở. Để trống giờ kết thúc = không giới hạn. Giờ theo giờ Việt Nam.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-3">Giao</th>
                <th className="p-3">Lớp</th>
                <th className="p-3">Bắt đầu</th>
                <th className="p-3">Kết thúc</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classInfo: any) => {
                const assignment = assignmentByClass.get(classInfo.id);
                return (
                  <tr key={classInfo.id} className="border-t">
                    <td className="p-3">
                      <input type="checkbox" name="class_ids" value={classInfo.id} defaultChecked={Boolean(assignment)} className="h-5 w-5 accent-teal-700" aria-label={`Giao cho lớp ${classInfo.name}`} />
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{classInfo.name}</p>
                      <p className="text-xs text-slate-500">{classInfo.class_students?.[0]?.count ?? 0} học sinh</p>
                    </td>
                    <td className="p-3">
                      <Input name={`start_${classInfo.id}`} type="datetime-local" defaultValue={toDateTimeInputValue(assignment?.start_time)} />
                    </td>
                    <td className="p-3">
                      <Input name={`end_${classInfo.id}`} type="datetime-local" defaultValue={toDateTimeInputValue(assignment?.end_time)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {exam?.status !== "open" ? (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="open_now" defaultChecked={!missing} className="h-4 w-4 accent-teal-700" />
          {exam?.status === "closed" ? "Mở lại đề sau khi lưu" : "Mở đề cho học sinh sau khi lưu"}
        </label>
      ) : (
        <p className="text-sm text-emerald-700">Đề đang mở. Bỏ tick một lớp để gỡ đề khỏi lớp đó.</p>
      )}

      <SubmitButton className="w-fit">Lưu giao đề</SubmitButton>
    </ActionForm>
  );
}
