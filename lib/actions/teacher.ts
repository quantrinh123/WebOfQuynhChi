"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

const createStudentSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

export async function createClass(formData: FormData) {
  const teacher = await requireTeacher();
  const values = classSchema.parse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null
  });
  const supabase = createServiceClient();
  await supabase.from("classes").insert({ teacher_id: teacher.id, ...values });
  revalidatePath("/teacher/classes");
}

export async function updateClass(classId: string, formData: FormData) {
  const teacher = await requireTeacher();
  const values = classSchema.parse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null
  });
  const supabase = createServiceClient();
  await supabase.from("classes").update(values).eq("id", classId).eq("teacher_id", teacher.id);
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function deleteClass(classId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await supabase.from("classes").delete().eq("id", classId).eq("teacher_id", teacher.id);
  revalidatePath("/teacher/classes");
  redirect("/teacher/classes");
}

export async function addStudentToClass(classId: string, formData: FormData) {
  const teacher = await requireTeacher();
  const email = String(formData.get("email") ?? "").trim();
  const supabase = createServiceClient();
  await assertTeacherOwnsClass(supabase, classId, teacher.id);
  const { data: userList } = await supabase.auth.admin.listUsers();
  const user = userList.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("Không tìm thấy học sinh với email này.");
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  if (profile?.role !== "student") throw new Error("Tài khoản này không phải học sinh.");
  await supabase.from("class_students").upsert({ class_id: classId, student_id: profile.id }, { onConflict: "class_id,student_id" });
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function createStudentAndAddToClass(classId: string, formData: FormData) {
  const teacher = await requireTeacher();
  const values = createStudentSchema.parse({
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? "")
  });
  const supabase = createServiceClient();
  await assertTeacherOwnsClass(supabase, classId, teacher.id);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: { full_name: values.full_name, role: "student" }
  });

  let userId = created.user?.id;
  if (createError || !userId) {
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existing = userList.users.find((item) => item.email?.toLowerCase() === values.email);
    if (!existing) throw createError ?? new Error("Không tạo được tài khoản học sinh.");
    userId = existing.id;
  }

  const { data: existingProfile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (existingProfile && existingProfile.role !== "student") {
    throw new Error("Email này đang thuộc tài khoản không phải học sinh.");
  }

  await supabase.from("profiles").upsert({ id: userId, full_name: values.full_name, role: "student" }, { onConflict: "id" });
  await supabase.from("class_students").upsert({ class_id: classId, student_id: userId }, { onConflict: "class_id,student_id" });
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await assertTeacherOwnsClass(supabase, classId, teacher.id);

  await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

async function assertTeacherOwnsClass(supabase: ReturnType<typeof createServiceClient>, classId: string, teacherId: string) {
  const { data: classInfo } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .single();
  if (!classInfo) throw new Error("Không tìm thấy lớp học.");
}

export async function generateMathThpt2025Questions(examId: string) {
  const supabase = createServiceClient();
  const sections = [
    { exam_id: examId, section_type: "single_choice", title: "Phần I. Trắc nghiệm", order_no: 1 },
    { exam_id: examId, section_type: "true_false", title: "Phần II. Đúng/Sai", order_no: 2 },
    { exam_id: examId, section_type: "short_answer", title: "Phần III. Trả lời ngắn", order_no: 3 }
  ];
  const { data: insertedSections, error } = await supabase.from("exam_sections").insert(sections).select();
  if (error) throw error;
  const sectionByType = new Map(insertedSections?.map((section) => [section.section_type, section.id]));

  const questions = [];
  for (let i = 1; i <= 12; i += 1) {
    questions.push({ exam_id: examId, section_id: sectionByType.get("single_choice"), question_no: i, question_type: "single_choice", score: 0.25, order_no: i });
  }
  for (let questionNo = 13; questionNo <= 16; questionNo += 1) {
    questions.push({ exam_id: examId, section_id: sectionByType.get("true_false"), question_no: questionNo, question_type: "true_false_group", score: 1, scoring_rule: "tf_group_0_0.1_0.25_0.5_1", order_no: questionNo * 10 });
  }
  for (let i = 17; i <= 22; i += 1) {
    questions.push({ exam_id: examId, section_id: sectionByType.get("short_answer"), question_no: i, question_type: "short_answer", score: 0.5, order_no: i * 10 });
  }
  const { data: insertedQuestions } = await supabase.from("exam_questions").insert(questions).select();
  const groups = insertedQuestions?.filter((question) => question.question_type === "true_false_group") ?? [];
  const items = groups.flatMap((group) =>
    ["a", "b", "c", "d"].map((label, index) => ({
      exam_id: examId,
      section_id: group.section_id,
      parent_question_id: group.id,
      question_no: group.question_no,
      sub_label: label,
      question_type: "true_false_item",
      score: 0,
      order_no: group.order_no + index + 1
    }))
  );
  if (items.length) await supabase.from("exam_questions").insert(items);
}

export async function createExamWithPdfs(formData: FormData) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: exam, error } = await supabase
    .from("exams")
    .insert({
      teacher_id: teacher.id,
      title: String(formData.get("title") ?? ""),
      grade: String(formData.get("grade") ?? "12"),
      duration_minutes: Number(formData.get("duration_minutes") ?? 90),
      total_score: Number(formData.get("total_score") ?? 10),
      exam_format: "math_thpt_2025",
      show_score_after_submit: formData.get("show_score_after_submit") === "on",
      show_answer_after_submit: formData.get("show_answer_after_submit") === "on"
    })
    .select()
    .single();
  if (error || !exam) throw error ?? new Error("Không tạo được đề thi");

  const questionFile = formData.get("question_pdf") as File | null;
  const answerFile = formData.get("answer_pdf") as File | null;
  const updates: Record<string, string> = {};
  if (questionFile?.size) {
    const path = `${teacher.id}/${exam.id}/question.pdf`;
    await supabase.storage.from("exam-pdfs").upload(path, questionFile, { upsert: true, contentType: "application/pdf" });
    updates.question_pdf_path = path;
  }
  if (answerFile?.size) {
    const path = `${teacher.id}/${exam.id}/answer.pdf`;
    await supabase.storage.from("exam-pdfs").upload(path, answerFile, { upsert: true, contentType: "application/pdf" });
    updates.answer_pdf_path = path;
  }
  if (Object.keys(updates).length) await supabase.from("exams").update(updates).eq("id", exam.id);
  await generateMathThpt2025Questions(exam.id);
  redirect(`/teacher/exams/${exam.id}/answer-key`);
}

export async function updateExamInfo(examId: string, formData: FormData) {
  const teacher = await requireTeacher();
  const status = String(formData.get("status") ?? "draft");
  const supabase = createServiceClient();
  await supabase
    .from("exams")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      grade: String(formData.get("grade") ?? "12").trim(),
      duration_minutes: Number(formData.get("duration_minutes") ?? 90),
      total_score: Number(formData.get("total_score") ?? 10),
      status: ["draft", "open", "closed"].includes(status) ? status : "draft",
      show_score_after_submit: formData.get("show_score_after_submit") === "on",
      show_answer_after_submit: formData.get("show_answer_after_submit") === "on",
      updated_at: new Date().toISOString()
    })
    .eq("id", examId)
    .eq("teacher_id", teacher.id);
  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${examId}/answer-key`);
  revalidatePath(`/teacher/exams/${examId}/results`);
}

export async function closeExam(examId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await supabase
    .from("exams")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", examId)
    .eq("teacher_id", teacher.id);
  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${examId}/results`);
}

export async function deleteExam(examId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, question_pdf_path, answer_pdf_path")
    .eq("id", examId)
    .eq("teacher_id", teacher.id)
    .single();
  if (!exam) throw new Error("Không tìm thấy đề thi.");

  const paths = [exam.question_pdf_path, exam.answer_pdf_path].filter(Boolean) as string[];
  if (paths.length) {
    await supabase.storage.from("exam-pdfs").remove(paths);
  }

  await supabase.from("exams").delete().eq("id", examId).eq("teacher_id", teacher.id);
  revalidatePath("/teacher/exams");
  redirect("/teacher/exams");
}

export async function updateAnswerKey(examId: string, formData: FormData) {
  await requireTeacher();
  const supabase = createServiceClient();
  const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", examId);
  for (const question of questions ?? []) {
    const update: Record<string, unknown> = { topic: formData.get(`topic_${question.id}`) || null };
    if (question.question_type === "single_choice") update.correct_answer = formData.get(`answer_${question.id}`);
    if (question.question_type === "true_false_item") update.correct_answer = formData.get(`tf_${question.id}`) === "true" ? "true" : "false";
    if (question.question_type === "short_answer") {
      update.correct_answers_json = String(formData.get(`short_${question.id}`) ?? "")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    const scoreValue = formData.get(`score_${question.id}`);
    if (scoreValue !== null && question.question_type !== "true_false_item") update.score = Number(scoreValue);
    await supabase.from("exam_questions").update(update).eq("id", question.id);
  }
  await supabase.from("exams").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", examId);
  revalidatePath(`/teacher/exams/${examId}/answer-key`);
  redirect("/teacher/exams");
}

export async function assignExamToClass(examId: string, formData: FormData) {
  await requireTeacher();
  const supabase = createServiceClient();
  await supabase.from("exam_assignments").upsert(
    {
      exam_id: examId,
      class_id: String(formData.get("class_id")),
      start_time: formData.get("start_time") || null,
      end_time: formData.get("end_time") || null
    },
    { onConflict: "exam_id,class_id" }
  );
  redirect(`/teacher/exams/${examId}/results`);
}
