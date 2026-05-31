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
    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mb-7">
        <div className="mb-4 h-1.5 w-14 rounded-full bg-teal-700" />
        <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-700">Luyện thi Toán THPT</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Đăng nhập</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Vào hệ thống để quản lý đề thi hoặc làm bài được giao.</p>
      </div>
      <label className="mb-4 block text-sm font-bold text-slate-700">
        Email
        <Input className="mt-1.5" name="email" type="email" required autoComplete="email" />
      </label>
      <label className="mb-5 block text-sm font-bold text-slate-700">
        Mật khẩu
        <Input className="mt-1.5" name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      <Button className="w-full gap-2 py-3" disabled={pending}>
        <LogIn size={18} />
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
