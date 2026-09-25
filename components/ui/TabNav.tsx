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
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {items.map((item) => {
        const active = activeHref ? activeHref === item.href : pathname === item.href || pathname.startsWith(`${item.matchPrefix ?? item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition",
              active ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {item.label}
            {item.badge !== undefined && item.badge !== null && item.badge !== "" ? (
              <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-600")}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
