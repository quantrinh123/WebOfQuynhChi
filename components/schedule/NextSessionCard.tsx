import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { addDays, CLASS_COLORS, occurrenceEnd, occurrenceStart, todayVN, WEEKDAY_LABELS, weekdayOf } from "@/lib/schedule";
import { loadCalendar } from "@/lib/schedule-data";
import { cn } from "@/lib/utils/format";

const JOIN_EARLY_MS = 15 * 60_000;

// Thẻ "Buổi học tiếp theo" (trong 14 ngày tới) cho trang học sinh.
export async function NextSessionCard({ classes }: { classes: Array<{ id: string; name: string; teacher_id: string; created_at: string }> }) {
  if (!classes.length) return null;
  const today = todayVN();
  const calendar = await loadCalendar({ classes, from: today, to: addDays(today, 14) });
  const now = Date.now();
  const next = calendar.events.find((event) => event.occurrence.status === "scheduled" && occurrenceEnd(event.occurrence) > now);
  if (!next) return null;

  const occurrence = next.occurrence;
  const startMs = occurrenceStart(occurrence);
  const live = now >= startMs && now <= occurrenceEnd(occurrence);
  const canJoin = occurrence.mode === "online" && occurrence.meetingUrl && now >= startMs - JOIN_EARLY_MS;
  const dayLabel = occurrence.date === today ? "Hôm nay" : occurrence.date === addDays(today, 1) ? "Ngày mai" : `${WEEKDAY_LABELS[weekdayOf(occurrence.date) - 1]}, ${occurrence.date.slice(8)}/${occurrence.date.slice(5, 7)}`;
  const color = CLASS_COLORS[next.colorIndex % CLASS_COLORS.length];

  return (
    <section className="surface animate-rise-in flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className={cn("flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl", color.pill)}>
        <span className="text-[11px] font-bold uppercase">{occurrence.date === today ? "Hôm nay" : `Th${occurrence.date.slice(5, 7)}`}</span>
        <span className="text-2xl font-black leading-none">{Number(occurrence.date.slice(8))}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-rose-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              Đang diễn ra
            </span>
          ) : (
            "Buổi học tiếp theo"
          )}
        </p>
        <p className="mt-1 truncate text-lg font-black text-slate-950">{occurrence.title || next.className}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className="font-semibold">
            {dayLabel} · {occurrence.start}–{occurrence.end}
          </span>
          <span className="inline-flex items-center gap-1">
            {occurrence.mode === "online" ? <Video size={14} /> : <MapPin size={14} />}
            {occurrence.mode === "online" ? "Online" : occurrence.location || "Tại lớp"}
          </span>
          {!live ? <span className="font-semibold text-teal-700">{countdown(startMs - now)}</span> : null}
        </p>
      </div>
      <div className="flex gap-2">
        {canJoin ? (
          <a
            href={occurrence.meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)]"
          >
            <ExternalLink size={16} />
            Vào học
          </a>
        ) : null}
        <Link href="/student/schedule" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          <CalendarDays size={16} />
          Xem lịch
        </Link>
      </div>
    </section>
  );
}

function countdown(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `còn ${hours} giờ ${minutes % 60 ? `${minutes % 60} phút` : ""}`.trim();
  return `còn ${Math.floor(hours / 24)} ngày`;
}
