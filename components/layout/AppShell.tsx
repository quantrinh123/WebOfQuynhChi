"use client";

import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/format";

export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="group/shell min-h-screen bg-slate-100 text-slate-950" data-collapsed={collapsed}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-[width] duration-200 md:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          title={collapsed ? "Mở sidebar" : "Thu sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        {sidebar}
      </aside>

      <main className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "md:pl-20" : "md:pl-64")}>
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:hidden">
          <strong>Luyện thi Toán</strong>
          <form action={signOut}>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700" title="Đăng xuất">
              <LogOut size={18} />
            </button>
          </form>
        </div>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
