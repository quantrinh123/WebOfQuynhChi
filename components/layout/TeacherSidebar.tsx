import Link from "next/link";
import { BarChart3, BookOpen, GraduationCap, LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const links = [
  { href: "/teacher/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/teacher/exams", label: "Đề thi", icon: BookOpen },
  { href: "/teacher/results", label: "Kết quả", icon: BarChart3 }
];

export function TeacherSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 min-h-14 pr-10">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700 group-data-[collapsed=true]/shell:hidden">Giáo viên</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950 group-data-[collapsed=true]/shell:hidden">Luyện thi Toán</h2>
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            title={link.label}
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2"
          >
            <link.icon size={19} />
            <span className="group-data-[collapsed=true]/shell:hidden">{link.label}</span>
          </Link>
        ))}
      </nav>
      <form action={signOut} className="mt-auto border-t border-slate-100 pt-3">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2">
          <LogOut size={19} />
          <span className="group-data-[collapsed=true]/shell:hidden">Đăng xuất</span>
        </button>
      </form>
    </div>
  );
}
