"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function login(_: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email hoặc mật khẩu không đúng." };

  const serviceSupabase = createServiceClient();
  const { data: profile } = await serviceSupabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role === "teacher") redirect("/teacher/dashboard");
  if (profile?.role === "student") redirect("/student/exams");
  return { error: "Tài khoản chưa có hồ sơ." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
