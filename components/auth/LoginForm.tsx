"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      setPending(false);
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    const profileResponse = await fetch("/api/auth/profile", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    });

    if (!profileResponse.ok) {
      await supabase.auth.signOut();
      setPending(false);
      setError("Tài khoản chưa có hồ sơ.");
      return;
    }

    const { profile } = (await profileResponse.json()) as { profile: { role: "teacher" | "student" } };
    window.location.href = profile.role === "teacher" ? "/teacher/dashboard" : "/student/exams";
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/70">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-700">Luyện thi Toán THPT</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Đăng nhập</h1>
      </div>
      <label className="mb-4 block text-sm font-semibold text-slate-700">
        Email
        <Input className="mt-1" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="mb-4 block text-sm font-semibold text-slate-700">
        Mật khẩu
        <Input className="mt-1" name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <Button className="w-full gap-2" disabled={pending}>
        <LogIn size={18} />
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
