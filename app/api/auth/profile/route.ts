import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const {
    data: { user },
    error: userError
  } = token ? await serviceSupabase.auth.getUser(token) : await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Tài khoản chưa có hồ sơ" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
