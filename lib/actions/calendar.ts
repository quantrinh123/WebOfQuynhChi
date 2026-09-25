"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { newCalendarToken } from "@/lib/calendar-token";
import { createServiceClient } from "@/lib/supabase/server";
import { failure, success, type ActionResult } from "@/lib/actions/result";

// Tạo link lịch mới: link cũ (nếu lỡ chia sẻ) ngừng hoạt động ngay.
export async function regenerateCalendarToken(_state: ActionResult, _formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createServiceClient();
  const { error } = await supabase.from("calendar_tokens").upsert({ user_id: profile.id, token: newCalendarToken(), created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return failure("Không tạo được link mới. Bạn đã chạy migration 004_calendar_tokens chưa?");
  revalidatePath(profile.role === "teacher" ? "/teacher/schedule" : "/student/schedule");
  return success("Đã tạo link mới. Hãy xoá lịch cũ trong Google Calendar và thêm lại.");
}
