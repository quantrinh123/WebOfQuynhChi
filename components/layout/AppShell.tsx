"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/format";

export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isExamTakingPage = /^\/student\/exams\/[^/]+\/take$/.test(pathname);

  return (
    <div className="group/shell min-h-screen bg-[#eef4f8] text-slate-950" data-collapsed={collapsed}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/80 bg-white/95 p-4 shadow-[12px_0_40px_rgba(15,23,42,0.05)] backdrop-blur transition-[width] duration-200 md:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          title={collapsed ? "Mở sidebar" : "Thu sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        {sidebar}
      </aside>

      <main className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "md:pl-20" : "md:pl-72")}>
        <div
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:hidden"
          )}
        >
          <strong>Luyện thi Toán</strong>
          <form action={signOut}>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700" title="Đăng xuất">
              <LogOut size={18} />
            </button>
          </form>
        </div>
        <div className={cn(isExamTakingPage ? "max-w-none p-0" : "mx-auto max-w-[1540px] p-4 sm:p-6 lg:p-10")}>{children}</div>
      </main>
    </div>
  );
}
