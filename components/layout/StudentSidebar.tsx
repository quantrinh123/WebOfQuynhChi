import Link from "next/link";
import { BookOpenCheck, LogOut, Trophy } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function StudentSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 min-h-14 pr-10">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700 group-data-[collapsed=true]/shell:hidden">Học sinh</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950 group-data-[collapsed=true]/shell:hidden">Luyện thi Toán</h2>
      </div>
      <nav className="space-y-1">
        <Link
          href="/student/exams"
          title="Bài thi"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2"
        >
          <BookOpenCheck size={19} />
          <span className="group-data-[collapsed=true]/shell:hidden">Bài thi</span>
        </Link>
        <Link
          href="/student/results"
          title="Kết quả"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2"
        >
          <Trophy size={19} />
          <span className="group-data-[collapsed=true]/shell:hidden">Kết quả</span>
        </Link>
      </nav>
      <form action={signOut} className="mt-auto border-t border-slate-100 pt-3">
        <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 group-data-[collapsed=true]/shell:justify-center group-data-[collapsed=true]/shell:px-2">
          <LogOut size={19} />
          <span className="group-data-[collapsed=true]/shell:hidden">Đăng xuất</span>
        </button>
      </form>
    </div>
  );
}
