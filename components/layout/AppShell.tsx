"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookOpenCheck, GraduationCap, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Sigma, Trophy, Video } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/format";

type Role = "teacher" | "student";

const NAV: Record<Role, Array<{ href: string; label: string; icon: React.ElementType }>> = {
  teacher: [
    { href: "/teacher/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
    { href: "/teacher/exams", label: "Đề thi", icon: BookOpen }
  ],
  student: [
    { href: "/student/exams", label: "Bài thi", icon: BookOpenCheck },
    { href: "/student/results", label: "Kết quả", icon: Trophy },
    { href: "/student/recordings", label: "Buổi học", icon: Video }
  ]
};

const ROLE_LABEL: Record<Role, string> = { teacher: "Giáo viên", student: "Học sinh" };

export function AppShell({ role, userName, children }: { role: Role; userName: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isExamTakingPage = /^\/student\/exams\/[^/]+\/take$/.test(pathname);
  const links = NAV[role];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Trang làm bài dùng toàn màn hình, không có sidebar.
  if (isExamTakingPage) return <>{children}</>;

  return (
    <div className="group/shell min-h-screen text-slate-950" data-collapsed={collapsed}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl transition-[width] duration-200 md:flex",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <div className={cn("mb-8 flex items-center gap-3", collapsed && "justify-center")}>
          <Logo />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-tight text-slate-950">Luyện thi Toán</p>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-600">{ROLE_LABEL[role]}</p>
            </div>
          ) : null}
        </div>

        <nav className="space-y-1.5">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_10px_24px_-10px_rgba(13,148,136,0.8)]"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950"
                )}
              >
                <link.icon size={19} className={cn(!active && "text-slate-400 transition group-hover:text-teal-600")} />
                {!collapsed ? <span>{link.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <div className={cn("flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-2.5", collapsed && "justify-center border-0 bg-transparent p-0")}>
            <Avatar name={userName} />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
                <p className="text-xs text-slate-500">{ROLE_LABEL[role]}</p>
              </div>
            ) : null}
            {!collapsed ? <SignOutButton compact /> : null}
          </div>
          {collapsed ? <SignOutButton compact className="mx-auto" /> : null}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed ? "Thu gọn" : null}
          </button>
        </div>
      </aside>

      <main className={cn("min-h-screen pb-24 transition-[padding] duration-200 md:pb-0", collapsed ? "md:pl-20" : "md:pl-72")}>
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-2.5 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-2.5">
            <Logo small />
            <div>
              <p className="text-sm font-black leading-tight">Luyện thi Toán</p>
              <p className="text-[11px] font-semibold text-slate-500">{userName}</p>
            </div>
          </div>
          <SignOutButton compact />
        </div>
        <div key={pathname} className="animate-page mx-auto max-w-[1540px] p-4 sm:p-6 lg:p-10">
          {children}
        </div>
      </main>

      {/* Menu dưới đáy màn hình cho điện thoại. */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex rounded-2xl border border-slate-200/70 bg-white/90 p-1.5 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl md:hidden">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-bold transition",
                active ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_8px_18px_-8px_rgba(13,148,136,0.8)]" : "text-slate-500"
              )}
            >
              <link.icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        "bg-brand flex shrink-0 items-center justify-center rounded-xl text-white shadow-[0_10px_24px_-8px_rgba(6,182,212,0.8)]",
        small ? "h-9 w-9" : "h-11 w-11"
      )}
    >
      <Sigma size={small ? 20 : 24} strokeWidth={2.6} />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white ring-2 ring-white">
      {initials}
    </div>
  );
}

function SignOutButton({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600",
          compact ? "h-9 w-9" : "h-10 gap-2 px-3 text-sm font-bold"
        )}
        title="Đăng xuất"
        aria-label="Đăng xuất"
      >
        <LogOut size={18} />
        {!compact ? "Đăng xuất" : null}
      </button>
    </form>
  );
}
