import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

type Supabase = ReturnType<typeof createServiceClient>;

export function newCalendarToken() {
  return randomBytes(24).toString("base64url");
}

// Lấy (hoặc tạo) mã lịch của người dùng. Trả về null nếu chưa chạy migration 004.
export async function getCalendarToken(supabase: Supabase, userId: string) {
  const { data, error } = await supabase.from("calendar_tokens").select("token").eq("user_id", userId).maybeSingle();
  if (error) return null;
  if (data?.token) return data.token as string;
  const token = newCalendarToken();
  const { error: insertError } = await supabase.from("calendar_tokens").insert({ user_id: userId, token });
  if (insertError) {
    // Có thể request khác vừa tạo xong: đọc lại.
    const { data: retry } = await supabase.from("calendar_tokens").select("token").eq("user_id", userId).maybeSingle();
    return (retry?.token as string) ?? null;
  }
  return token;
}

// Địa chỉ web công khai: ưu tiên NEXT_PUBLIC_APP_URL, nếu không có thì lấy từ request hiện tại.
export async function getAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function getCalendarFeed(userId: string) {
  const supabase = createServiceClient();
  const token = await getCalendarToken(supabase, userId);
  if (!token) return null;
  const origin = await getAppOrigin();
  const httpUrl = `${origin}/api/calendar/${token}.ics`;
  const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");
  return {
    httpUrl,
    googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    isLocal: /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(origin)
  };
}
