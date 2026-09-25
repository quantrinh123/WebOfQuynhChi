import { updateAnswerKey } from "@/lib/actions/teacher";
import { AnswerKeyForm } from "@/components/exam/AnswerKeyForm";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AnswerKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", id).order("order_no");
  const { data: teacherTopics } = await supabase
    .from("exam_questions")
    .select("topic, exams!inner(teacher_id)")
    .eq("exams.teacher_id", teacher.id)
    .not("topic", "is", null)
    .limit(2000);

  const all = questions ?? [];
  const singles = all.filter((q) => q.question_type === "single_choice");
  const shorts = all.filter((q) => q.question_type === "short_answer");
  const groups = all
    .filter((q) => q.question_type === "true_false_group")
    .map((group) => {
      const items = all.filter((q) => q.parent_question_id === group.id);
      // Đề cũ lưu chủ đề ở từng ý: lấy chủ đề của ý đầu tiên nếu câu chưa có.
      return { ...group, topic: group.topic ?? items.find((item) => item.topic)?.topic ?? null, items };
    });
  const topicSuggestions = Array.from(new Set((teacherTopics ?? []).map((row: any) => String(row.topic).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));

  return (
    <AnswerKeyForm
      action={updateAnswerKey.bind(null, id)}
      singles={singles}
      groups={groups}
      shorts={shorts}
      topicSuggestions={topicSuggestions}
    />
  );
}
