"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Luyện thi Toán</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Đăng nhập</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Nhập email và mật khẩu giáo viên đã cấp cho bạn.</p>
      </div>
      <label className="mb-4 block text-sm font-bold text-slate-700">
        Email
        <div className="relative mt-1.5">
          <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="h-12 pl-11" name="email" type="email" required autoComplete="email" placeholder="ban@email.com" />
        </div>
      </label>
      <label className="mb-6 block text-sm font-bold text-slate-700">
        Mật khẩu
        <div className="relative mt-1.5">
          <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="h-12 pl-11 pr-12" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••" />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      {error ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      <Button className="h-12 w-full gap-2 text-base" disabled={pending}>
        {pending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <p className="mt-6 text-center text-xs text-slate-500">Chưa có tài khoản? Liên hệ giáo viên để được cấp tài khoản.</p>
    </form>
  );
}
