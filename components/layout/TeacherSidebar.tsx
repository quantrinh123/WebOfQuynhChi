"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/format";

const links = [
  { href: "/teacher/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/teacher/exams", label: "Đề thi", icon: BookOpen },
  { href: "/teacher/results", label: "Kết quả", icon: BarChart3 }
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 min-h-16 pr-10">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 group-data-[collapsed=true]/shell:hidden">Giáo viên</p>
        <h2 className="mt-2 text-xl font-black text-slate-950 group-data-[collapsed=true]/shell:hidden">Luyện thi Toán</h2>
      </div>
      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.label}
              href={link.href}
              title={link.label}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2",
                active ? "bg-teal-700 text-white shadow-[0_12px_24px_rgba(15,118,110,0.22)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <link.icon size={19} />
              <span className="group-data-[collapsed=true]/shell:hidden">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="mt-auto border-t border-slate-100 pt-4">
        <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2">
          <LogOut size={19} />
          <span className="group-data-[collapsed=true]/shell:hidden">Đăng xuất</span>
        </button>
      </form>
    </div>
  );
}
