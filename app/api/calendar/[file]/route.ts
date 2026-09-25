import { buildIcs } from "@/lib/calendar-feed";
import { addDays, todayVN } from "@/lib/schedule";
import { loadCalendar } from "@/lib/schedule-data";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Google Calendar gọi đường dẫn này định kỳ để lấy lịch: /api/calendar/<mã>.ics (không cần đăng nhập).
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/i, "");
  if (!/^[\w-]{20,}$/.test(token)) return new Response("Not found", { status: 404 });

  const supabase = createServiceClient();
  const { data: owner } = await supabase.from("calendar_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!owner) return new Response("Not found", { status: 404 });
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", owner.user_id).maybeSingle();
  if (!profile) return new Response("Not found", { status: 404 });

  const classes =
    profile.role === "teacher"
      ? ((await supabase.from("classes").select("id, name, teacher_id, created_at").eq("teacher_id", profile.id)).data ?? [])
      : (((await supabase.from("class_students").select("classes(id, name, teacher_id, created_at)").eq("student_id", profile.id)).data ?? [])
          .map((row: any) => row.classes)
          .filter(Boolean) as Array<{ id: string; name: string; teacher_id: string; created_at: string }>);

  const today = todayVN();
  const calendar = await loadCalendar({ classes, from: addDays(today, -30), to: addDays(today, 90) });
  const body = buildIcs({
    calendarName: profile.role === "teacher" ? "Lịch dạy · Luyện thi Toán" : "Lịch học · Luyện thi Toán",
    events: calendar.events
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lich-hoc.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}
