"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

export type TabItem = {
  href: string;
  label: string;
  badge?: string | number | null;
  // Tab được coi là đang mở khi đường dẫn bắt đầu bằng giá trị này (mặc định = href).
  matchPrefix?: string;
};

export function TabNav({ items, activeHref }: { items: TabItem[]; activeHref?: string }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/70 p-1 shadow-sm backdrop-blur-sm [scrollbar-width:none]">
      {items.map((item) => {
        const active = activeHref ? activeHref === item.href : pathname === item.href || pathname.startsWith(`${item.matchPrefix ?? item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
              active
                ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_8px_18px_-8px_rgba(13,148,136,0.7)]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
          >
            {item.label}
            {item.badge !== undefined && item.badge !== null && item.badge !== "" ? (
              <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600")}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
