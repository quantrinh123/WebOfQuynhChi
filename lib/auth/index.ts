import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = createServiceClient();
  const { data } = await serviceSupabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireTeacher() {
  const profile = await requireProfile();
  if (profile.role !== "teacher") redirect("/student/exams");
  return profile;
}

export async function requireStudent() {
  const profile = await requireProfile();
  if (profile.role !== "student") redirect("/teacher/dashboard");
  return profile;
}
