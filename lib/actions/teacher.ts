"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth";
import { countMissingAnswers } from "@/lib/exam-setup";
import { createServiceClient } from "@/lib/supabase/server";
import { fromDateTimeInputValue } from "@/lib/utils/format";
import { errorMessage, failure, success, type ActionResult } from "@/lib/actions/result";

type Supabase = ReturnType<typeof createServiceClient>;

const classSchema = z.object({
  name: z.string().min(1, "Tên lớp không được để trống."),
  description: z.string().nullable()
});

const createStudentSchema = z.object({
  full_name: z.string().min(1, "Họ tên không được để trống."),
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
});

const recordingSchema = z.object({
  title: z.string().min(1, "Tên buổi học không được để trống."),
  url: z
    .string()
    .url("Link không hợp lệ.")
    .refine((value) => /^https?:\/\//i.test(value), "Link phải bắt đầu bằng http:// hoặc https://"),
  recorded_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
});

const examInfoSchema = z.object({
  title: z.string().min(1, "Tên đề không được để trống."),
  grade: z.string().min(1),
  duration_minutes: z.number().int().min(1, "Thời gian làm bài phải lớn hơn 0.").max(600),
  total_score: z.number().positive("Tổng điểm phải lớn hơn 0.")
});

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ.";
}

function readClassValues(formData: FormData) {
  return classSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null
  });
}

// ---------- Lớp học ----------

export async function createClass(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const parsed = readClassValues(formData);
  if (!parsed.success) return failure(firstIssue(parsed.error));
  const supabase = createServiceClient();
  const { error } = await supabase.from("classes").insert({ teacher_id: teacher.id, ...parsed.data });
  if (error) return failure("Không tạo được lớp.");
  revalidatePath("/teacher/classes");
  return success(`Đã tạo lớp ${parsed.data.name}.`);
}

export async function updateClass(classId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const parsed = readClassValues(formData);
  if (!parsed.success) return failure(firstIssue(parsed.error));
  const supabase = createServiceClient();
  const { error } = await supabase.from("classes").update(parsed.data).eq("id", classId).eq("teacher_id", teacher.id);
  if (error) return failure("Không cập nhật được lớp.");
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  return success("Đã cập nhật thông tin lớp.");
}

export async function deleteClass(classId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await supabase.from("classes").delete().eq("id", classId).eq("teacher_id", teacher.id);
  revalidatePath("/teacher/classes");
  redirect("/teacher/classes");
}

export async function addStudentToClass(classId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return failure("Hãy nhập email học sinh.");
    const supabase = createServiceClient();
    await assertTeacherOwnsClass(supabase, classId, teacher.id);
    const user = await findUserByEmail(supabase, email);
    if (!user) return failure("Không tìm thấy tài khoản với email này.");
    const { data: profile } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).maybeSingle();
    if (profile?.role !== "student") return failure("Tài khoản này không phải học sinh.");
    await supabase.from("class_students").upsert({ class_id: classId, student_id: profile.id }, { onConflict: "class_id,student_id" });
    revalidatePath(`/teacher/classes/${classId}`);
    return success(`Đã thêm ${profile.full_name} vào lớp.`);
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function createStudentAndAddToClass(classId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const parsed = createStudentSchema.safeParse({
      full_name: String(formData.get("full_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? "")
    });
    if (!parsed.success) return failure(firstIssue(parsed.error));
    const values = parsed.data;
    const supabase = createServiceClient();
    await assertTeacherOwnsClass(supabase, classId, teacher.id);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: true,
      user_metadata: { full_name: values.full_name, role: "student" }
    });

    let userId = created.user?.id;
    let alreadyExisted = false;
    if (createError || !userId) {
      const existing = await findUserByEmail(supabase, values.email);
      if (!existing) return failure(createError?.message ?? "Không tạo được tài khoản học sinh.");
      userId = existing.id;
      alreadyExisted = true;
    }

    const { data: existingProfile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (existingProfile && existingProfile.role !== "student") return failure("Email này đang thuộc tài khoản không phải học sinh.");

    await supabase.from("profiles").upsert({ id: userId, full_name: values.full_name, role: "student" }, { onConflict: "id" });
    await supabase.from("class_students").upsert({ class_id: classId, student_id: userId }, { onConflict: "class_id,student_id" });
    revalidatePath(`/teacher/classes/${classId}`);
    return success(
      alreadyExisted
        ? `Email đã có tài khoản, đã thêm ${values.full_name} vào lớp (mật khẩu cũ giữ nguyên).`
        : `Đã tạo tài khoản và thêm ${values.full_name} vào lớp.`
    );
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await assertTeacherOwnsClass(supabase, classId, teacher.id);

  await supabase.from("class_students").delete().eq("class_id", classId).eq("student_id", studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function addClassRecording(classId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const parsed = recordingSchema.safeParse({
      title: String(formData.get("title") ?? "").trim(),
      url: String(formData.get("url") ?? "").trim(),
      recorded_at: String(formData.get("recorded_at") ?? "").trim() || null
    });
    if (!parsed.success) return failure(firstIssue(parsed.error));
    const supabase = createServiceClient();
    await assertTeacherOwnsClass(supabase, classId, teacher.id);
    const { error } = await supabase.from("class_recordings").insert({ class_id: classId, ...parsed.data });
    if (error) return failure("Không lưu được link. Bạn đã chạy migration class_recordings chưa?");
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath("/student/recordings");
    return success("Đã thêm link record.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function deleteClassRecording(classId: string, recordingId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await assertTeacherOwnsClass(supabase, classId, teacher.id);
  await supabase.from("class_recordings").delete().eq("id", recordingId).eq("class_id", classId);
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/student/recordings");
}

// Giao đề từ trang lớp.
export async function assignExamFromClass(classId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const examId = String(formData.get("exam_id") ?? "");
    if (!examId) return failure("Hãy chọn đề cần giao.");
    const supabase = createServiceClient();
    await assertTeacherOwnsClass(supabase, classId, teacher.id);
    await assertTeacherOwnsExam(supabase, examId, teacher.id);
    const window = readWindow(formData.get("start_time"), formData.get("end_time"));
    if (!window.ok) return failure(window.message);
    const { error } = await supabase
      .from("exam_assignments")
      .upsert({ exam_id: examId, class_id: classId, start_time: window.start, end_time: window.end }, { onConflict: "exam_id,class_id" });
    if (error) return failure("Không giao được đề.");
    revalidateExam(examId);
    revalidatePath(`/teacher/classes/${classId}`);
    return success("Đã giao đề cho lớp.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function unassignExam(examId: string, classId: string) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await assertTeacherOwnsExam(supabase, examId, teacher.id);
  await supabase.from("exam_assignments").delete().eq("exam_id", examId).eq("class_id", classId);
  revalidateExam(examId);
  revalidatePath(`/teacher/classes/${classId}`);
}

// ---------- Đề thi ----------

type ExamUpload = {
  path: string;
  token: string;
};

export async function prepareExamCreation(formData: FormData) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  const examId = String(formData.get("exam_id") ?? "").trim() || crypto.randomUUID();

  // Không cho ghi đè đề của giáo viên khác nếu client gửi lên id đã tồn tại.
  const { data: existing } = await supabase.from("exams").select("teacher_id").eq("id", examId).maybeSingle();
  if (existing && existing.teacher_id !== teacher.id) throw new Error("Không tạo được đề thi.");

  const { data: exam, error } = await supabase
    .from("exams")
    .upsert(
      {
        id: examId,
        teacher_id: teacher.id,
        title: String(formData.get("title") ?? ""),
        grade: String(formData.get("grade") ?? "12"),
        duration_minutes: Number(formData.get("duration_minutes") ?? 90),
        total_score: Number(formData.get("total_score") ?? 10),
        exam_format: "math_thpt_2025",
        show_score_after_submit: formData.get("show_score_after_submit") === "on",
        show_answer_after_submit: formData.get("show_answer_after_submit") === "on",
        status: "draft",
        question_pdf_path: null,
        answer_pdf_path: null
      },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error || !exam) throw error ?? new Error("Không tạo được đề thi");

  const questionUpload = await supabase.storage.from("exam-pdfs").createSignedUploadUrl(`${teacher.id}/${examId}/question.pdf`, {
    upsert: true
  });
  if (questionUpload.error || !questionUpload.data) throw questionUpload.error ?? new Error("Không tạo được link upload PDF đề thi.");

  const answerUpload = await supabase.storage.from("exam-pdfs").createSignedUploadUrl(`${teacher.id}/${examId}/answer.pdf`, {
    upsert: true
  });
  if (answerUpload.error || !answerUpload.data) throw answerUpload.error ?? new Error("Không tạo được link upload PDF đáp án.");

  return {
    examId,
    questionUpload: {
      path: questionUpload.data.path,
      token: questionUpload.data.token
    } satisfies ExamUpload,
    answerUpload: {
      path: answerUpload.data.path,
      token: answerUpload.data.token
    } satisfies ExamUpload
  };
}

export async function finalizeExamCreation(
  examId: string,
  payload: { questionPdfPath: string; answerPdfPath?: string | null }
) {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  await assertTeacherOwnsExam(supabase, examId, teacher.id);
  const { error } = await supabase
    .from("exams")
    .update({
      question_pdf_path: payload.questionPdfPath,
      answer_pdf_path: payload.answerPdfPath ?? null
    })
    .eq("id", examId)
    .eq("teacher_id", teacher.id);
  if (error) throw error;

  await generateMathThpt2025Questions(supabase, examId);
  revalidatePath("/teacher/exams");
  revalidatePath(`/teacher/exams/${examId}/answer-key`);
  return { redirectTo: `/teacher/exams/${examId}/answer-key` };
}

export async function updateExamInfo(examId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const parsed = examInfoSchema.safeParse({
      title: String(formData.get("title") ?? "").trim(),
      grade: String(formData.get("grade") ?? "12").trim() || "12",
      duration_minutes: Number(formData.get("duration_minutes") ?? 90),
      total_score: Number(formData.get("total_score") ?? 10)
    });
    if (!parsed.success) return failure(firstIssue(parsed.error));
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("exams")
      .update({
        ...parsed.data,
        show_score_after_submit: formData.get("show_score_after_submit") === "on",
        show_answer_after_submit: formData.get("show_answer_after_submit") === "on",
        updated_at: new Date().toISOString()
      })
      .eq("id", examId)
      .eq("teacher_id", teacher.id);
    if (error) return failure("Không lưu được thông tin đề.");
    revalidateExam(examId);
    return success("Đã lưu thông tin đề.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export async function setExamStatus(examId: string, status: "draft" | "open" | "closed", _state: ActionResult, _formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();
    const supabase = createServiceClient();
    await assertTeacherOwnsExam(supabase, examId, teacher.id);
    if (status === "open") {
      const problem = await getOpenBlocker(supabase, examId);
      if (problem) return failure(problem);
    }
    await supabase.from("exams").update({ status, updated_at: new Date().toISOString() }).eq("id", examId).eq("teacher_id", teacher.id);
    revalidateExam(examId);
    return success(status === "open" ? "Đã mở đề. Học sinh có thể bắt đầu làm bài." : status === "closed" ? "Đã đóng đề." : "Đã chuyển đề về bản nháp.");
  } catch (error) {
    return failure(errorMessage(error));
  }
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

export async function updateAnswerKey(examId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  try {
    await assertTeacherOwnsExam(supabase, examId, teacher.id);
    const { data: questions } = await supabase.from("exam_questions").select("*").eq("exam_id", examId);
    const all = questions ?? [];
    const groupTopic = new Map(
      all.filter((question) => question.question_type === "true_false_group").map((group) => [group.id, readTopic(formData, group.id)])
    );

    for (const question of all) {
      const update: Record<string, unknown> = {};
      if (question.question_type === "single_choice") {
        const value = String(formData.get(`answer_${question.id}`) ?? "").toUpperCase();
        update.correct_answer = ["A", "B", "C", "D"].includes(value) ? value : null;
        update.topic = readTopic(formData, question.id);
      }
      if (question.question_type === "true_false_group") update.topic = groupTopic.get(question.id);
      if (question.question_type === "true_false_item") {
        const value = String(formData.get(`tf_${question.id}`) ?? "");
        update.correct_answer = value === "true" || value === "false" ? value : null;
        // Chủ đề nhập ở cấp câu, áp dụng cho cả 4 ý.
        update.topic = question.parent_question_id ? groupTopic.get(question.parent_question_id) ?? null : null;
      }
      if (question.question_type === "short_answer") {
        update.correct_answers_json = String(formData.get(`short_${question.id}`) ?? "")
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean);
        update.topic = readTopic(formData, question.id);
      }
      const scoreValue = formData.get(`score_${question.id}`);
      if (scoreValue !== null && scoreValue !== "" && question.question_type !== "true_false_item") {
        const score = Number(scoreValue);
        if (Number.isFinite(score) && score >= 0) update.score = score;
      }
      await supabase.from("exam_questions").update(update).eq("id", question.id);
    }
    await supabase.from("exams").update({ updated_at: new Date().toISOString() }).eq("id", examId);
    revalidateExam(examId);
  } catch (error) {
    return failure(errorMessage(error));
  }

  const { data: saved } = await supabase.from("exam_questions").select("question_type, correct_answer, correct_answers_json").eq("exam_id", examId);
  const missing = countMissingAnswers(saved ?? []);
  if (formData.get("intent") === "next") {
    if (missing) return failure(`Đã lưu. Còn ${missing} câu/ý chưa có đáp án, hãy nhập đủ trước khi giao đề.`);
    redirect(`/teacher/exams/${examId}/assign`);
  }
  return missing ? success(`Đã lưu nháp. Còn ${missing} câu/ý chưa có đáp án.`) : success("Đã lưu đáp án. Đáp án đã đầy đủ.");
}

// Đồng bộ danh sách lớp được giao: lớp được tick thì giao / cập nhật giờ, lớp bỏ tick thì gỡ.
export async function saveExamAssignments(examId: string, _state: ActionResult, formData: FormData): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const supabase = createServiceClient();
  let openMessage = "";
  try {
    await assertTeacherOwnsExam(supabase, examId, teacher.id);
    const { data: classes } = await supabase.from("classes").select("id, name").eq("teacher_id", teacher.id);
    const selected = new Set(formData.getAll("class_ids").map(String));
    const rows = [];
    for (const classInfo of classes ?? []) {
      if (!selected.has(classInfo.id)) continue;
      const window = readWindow(formData.get(`start_${classInfo.id}`), formData.get(`end_${classInfo.id}`));
      if (!window.ok) return failure(`Lớp ${classInfo.name}: ${window.message}`);
      rows.push({ exam_id: examId, class_id: classInfo.id, start_time: window.start, end_time: window.end });
    }

    const ownClassIds = (classes ?? []).map((item) => item.id);
    const toRemove = ownClassIds.filter((id) => !selected.has(id));
    if (toRemove.length) await supabase.from("exam_assignments").delete().eq("exam_id", examId).in("class_id", toRemove);
    if (rows.length) {
      const { error } = await supabase.from("exam_assignments").upsert(rows, { onConflict: "exam_id,class_id" });
      if (error) return failure("Không lưu được lịch giao đề.");
    }

    if (formData.get("open_now") === "on") {
      const problem = await getOpenBlocker(supabase, examId);
      if (problem) {
        openMessage = ` Chưa mở đề: ${problem}`;
      } else {
        await supabase.from("exams").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", examId);
        openMessage = " Đề đã được mở cho học sinh.";
      }
    }

    revalidateExam(examId);
    ownClassIds.forEach((id) => revalidatePath(`/teacher/classes/${id}`));
    if (openMessage.startsWith(" Chưa")) return failure(`Đã lưu lịch giao đề.${openMessage}`);
    return success(rows.length ? `Đã giao đề cho ${rows.length} lớp.${openMessage}` : "Đề hiện không giao cho lớp nào.");
  } catch (error) {
    return failure(errorMessage(error));
  }
}

// ---------- Hàm nội bộ ----------

async function getOpenBlocker(supabase: Supabase, examId: string) {
  const [{ data: questions }, { count }] = await Promise.all([
    supabase.from("exam_questions").select("question_type, correct_answer, correct_answers_json").eq("exam_id", examId),
    supabase.from("exam_assignments").select("id", { count: "exact", head: true }).eq("exam_id", examId)
  ]);
  const missing = countMissingAnswers(questions ?? []);
  if (!questions?.length) return "Đề chưa có câu hỏi.";
  if (missing) return `Còn ${missing} câu/ý chưa có đáp án.`;
  if (!count) return "Đề chưa được giao cho lớp nào.";
  return null;
}

function readTopic(formData: FormData, questionId: string) {
  return String(formData.get(`topic_${questionId}`) ?? "").trim() || null;
}

function readWindow(startValue: FormDataEntryValue | null, endValue: FormDataEntryValue | null) {
  const start = fromDateTimeInputValue(startValue);
  const end = fromDateTimeInputValue(endValue);
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    return { ok: false as const, message: "Giờ kết thúc phải sau giờ bắt đầu." };
  }
  return { ok: true as const, start, end };
}

function revalidateExam(examId: string) {
  revalidatePath("/teacher/exams");
  revalidatePath("/teacher/dashboard");
  revalidatePath(`/teacher/exams/${examId}`, "layout");
  revalidatePath("/student/exams");
}

async function assertTeacherOwnsClass(supabase: Supabase, classId: string, teacherId: string) {
  const { data: classInfo } = await supabase.from("classes").select("id").eq("id", classId).eq("teacher_id", teacherId).maybeSingle();
  if (!classInfo) throw new Error("Không tìm thấy lớp học.");
}

async function assertTeacherOwnsExam(supabase: Supabase, examId: string, teacherId: string) {
  const { data: exam } = await supabase.from("exams").select("id").eq("id", examId).eq("teacher_id", teacherId).maybeSingle();
  if (!exam) throw new Error("Không tìm thấy đề thi.");
}

// listUsers trả về theo trang (mặc định 50 user/trang) nên phải duyệt hết các trang.
async function findUserByEmail(supabase: Supabase, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function generateMathThpt2025Questions(supabase: Supabase, examId: string) {
  await supabase.from("exam_questions").delete().eq("exam_id", examId);
  await supabase.from("exam_sections").delete().eq("exam_id", examId);

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
