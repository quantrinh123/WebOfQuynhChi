"use client";

import { useState } from "react";
import { AlertTriangle, Bell, CalendarCheck2, Check, Copy, RefreshCw } from "lucide-react";
import { regenerateCalendarToken } from "@/lib/actions/calendar";
import { ActionForm, SubmitButton } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";

export type CalendarFeed = { httpUrl: string; googleUrl: string; isLocal: boolean } | null;

// Nút + hộp thoại đồng bộ lịch học vào Google Calendar.
export function GoogleCalendarSync({ feed }: { feed: CalendarFeed }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!feed) return;
    await navigator.clipboard.writeText(feed.httpUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
      >
        <GoogleCalendarIcon />
        Thêm vào Google Calendar
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Đồng bộ vào Google Calendar" description="Lịch học tự hiện trên Google Calendar và điện thoại sẽ nhắc trước giờ học.">
        {!feed ? (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            Chưa bật được tính năng này. Quản trị viên cần chạy migration 004_calendar_tokens.sql trên Supabase.
          </p>
        ) : (
          <div className="grid gap-5">
            {feed.isLocal ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                Web đang chạy trên máy (localhost) nên Google chưa đọc được lịch. Đưa web lên internet và đặt NEXT_PUBLIC_APP_URL là địa chỉ thật rồi thử lại.
              </p>
            ) : null}

            <a
              href={feed.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.8)] transition hover:from-sky-700 hover:to-blue-700"
            >
              <CalendarCheck2 size={20} />
              Thêm vào Google Calendar
            </a>

            <ol className="grid gap-3 text-sm text-slate-600">
              <Step index={1}>
                Bấm nút trên, Google Calendar mở trang <strong className="text-slate-900">&quot;Thêm lịch&quot;</strong> → bấm <strong className="text-slate-900">Thêm</strong>.
              </Step>
              <Step index={2}>
                <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                  <Bell size={14} />
                  Bật thông báo:
                </span>{" "}
                trên máy tính vào <strong className="text-slate-900">Cài đặt</strong> → chọn lịch <strong className="text-slate-900">&quot;Lịch học · Luyện thi Toán&quot;</strong> → <strong className="text-slate-900">Thông báo sự kiện</strong> → thêm <strong className="text-slate-900">1 giờ trước</strong>.
              </Step>
              <Step index={3}>
                Trên điện thoại, mở app <strong className="text-slate-900">Google Calendar</strong> → <strong className="text-slate-900">Cài đặt</strong> → chọn lịch vừa thêm → bật <strong className="text-slate-900">Đồng bộ hoá</strong>.
              </Step>
            </ol>

            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Khi giáo viên thêm, huỷ hoặc dời buổi, Google Calendar sẽ tự cập nhật sau vài giờ (có thể tới 24 giờ, do Google quy định). Buổi huỷ gấp trong ngày nên báo thêm qua nhóm lớp.
            </p>

            <div className="grid gap-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Link lịch riêng của bạn</p>
              <div className="flex gap-2">
                <input readOnly value={feed.httpUrl} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" aria-label="Link lịch" />
                <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>
              <p className="text-xs text-slate-500">Không chia sẻ link này cho người khác. Nếu lỡ chia sẻ, hãy tạo link mới.</p>
              <ActionForm action={regenerateCalendarToken}>
                <SubmitButton variant="secondary" className="h-9 text-xs" pendingText="Đang tạo..." confirmMessage="Tạo link mới? Link cũ sẽ ngừng hoạt động, bạn cần xoá lịch cũ trong Google Calendar và thêm lại.">
                  <RefreshCw size={14} />
                  Tạo link mới
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">{index}</span>
      <span className="leading-6">{children}</span>
    </li>
  );
}

function GoogleCalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" stroke="#4285F4" strokeWidth="2" />
      <path d="M3 9h18" stroke="#4285F4" strokeWidth="2" />
      <path d="M8 2.5v3M16 2.5v3" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
      <text x="12" y="18.2" textAnchor="middle" fontSize="8" fontWeight="800" fill="#34A853">
        31
      </text>
    </svg>
  );
}
