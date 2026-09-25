"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  PencilLine,
  PlayCircle,
  Plus,
  RotateCcw,
  Trash2,
  UserX,
  Video,
  XCircle
} from "lucide-react";
import { deleteClassSchedule, deleteHoliday, deleteSession, saveAttendance, saveClassSchedule, saveSession, setSessionStatus, addHoliday } from "@/lib/actions/schedule";
import type { ActionResult } from "@/lib/actions/result";
import { ActionForm, SubmitButton, Toast } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CLASS_COLORS, WEEKDAY_LABELS, WEEKDAY_SHORT, occurrenceEnd, occurrenceStart, type HolidayRow, type ScheduleRow } from "@/lib/schedule";
import type { AttendanceStatus, CalendarClass, CalendarEvent, RosterStudent } from "@/lib/schedule-data";
import { cn } from "@/lib/utils/format";

type SessionEvent = CalendarEvent;
const MAX_PER_CELL = 3;
const JOIN_EARLY_MS = 15 * 60_000;

export function ScheduleBoard({
  role,
  month,
  monthTitle,
  prevHref,
  nextHref,
  todayHref,
  filterOptions,
  days,
  today,
  events,
  holidays,
  classes,
  schedules,
  rosters,
  summary
}: {
  role: "teacher" | "student";
  month: string;
  monthTitle: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  filterOptions: Array<{ label: string; href: string; active: boolean }>;
  days: string[];
  today: string;
  events: CalendarEvent[];
  holidays: HolidayRow[];
  classes: CalendarClass[];
  schedules: ScheduleRow[];
  rosters: Record<string, RosterStudent[]>;
  summary: { sessions: number; classes: number };
}) {
  const router = useRouter();
  const isTeacher = role === "teacher";
  const [selected, setSelected] = useState<SessionEvent | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [form, setForm] = useState<{ event?: SessionEvent; date?: string } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [flash, setFlash] = useState<ActionResult>(null);
  const [attendanceFor, setAttendanceFor] = useState<SessionEvent | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const eventsByDay = new Map<string, CalendarEvent[]>();
  events.forEach((event) => eventsByDay.set(event.date, [...(eventsByDay.get(event.date) ?? []), event]));
  const holidayByDay = new Map(holidays.map((holiday) => [holiday.holiday_date, holiday]));
  const inMonth = (date: string) => date.startsWith(month);
  const done = (result: NonNullable<ActionResult>) => {
    setFlash({ ...result });
    setForm(null);
    setSelected(null);
    setSetupOpen(false);
  };

  const todayEvents = eventsByDay.get(today) ?? [];
  const upcoming = events.filter((event) => event.date > today && event.occurrence.status === "scheduled").slice(0, 5);
  const monthCountByClass = new Map<string, number>();
  events.forEach((event) => {
    if (inMonth(event.date) && event.occurrence.status === "scheduled") monthCountByClass.set(event.occurrence.classId, (monthCountByClass.get(event.occurrence.classId) ?? 0) + 1);
  });
  const canOpenDay = (date: string) => isTeacher || Boolean(eventsByDay.get(date)?.length);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="surface min-w-0 overflow-hidden">
        {/* Đầu thẻ: tháng + điều hướng + thao tác */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{monthTitle}</h2>
              <p className="text-xs font-semibold text-slate-500">
                {summary.sessions} buổi · {summary.classes} lớp
              </p>
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <Link href={prevHref} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Tháng trước">
                <ChevronLeft size={18} />
              </Link>
              <Link href={todayHref} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100">
                Hôm nay
              </Link>
              <Link href={nextHref} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Tháng sau">
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.length > 1 ? (
              <Select
                aria-label="Lọc theo lớp"
                className="h-10 w-auto min-w-44 py-2"
                value={filterOptions.find((option) => option.active)?.href ?? filterOptions[0].href}
                onChange={(event) => router.push(event.target.value)}
              >
                {filterOptions.map((option) => (
                  <option key={option.href} value={option.href}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : null}
            {isTeacher ? (
              <>
                <ToolbarButton onClick={() => setHolidayOpen(true)} icon={CalendarRange} label="Ngày nghỉ" />
                <ToolbarButton onClick={() => setSetupOpen(true)} icon={AlarmClock} label="Lịch cố định" />
                <button
                  type="button"
                  onClick={() => setForm({ date: today })}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)] transition hover:from-teal-700 hover:to-cyan-700"
                >
                  <CalendarPlus size={16} />
                  Thêm buổi
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Lưới tháng (máy tính) */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAY_SHORT.map((label, index) => (
              <div key={label} className={cn("py-2.5 text-center text-[11px] font-bold uppercase tracking-wider", index >= 5 ? "text-rose-400" : "text-slate-400")}>
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date, index) => {
              const dayEvents = eventsByDay.get(date) ?? [];
              const holiday = holidayByDay.get(date);
              const isToday = date === today;
              const weekend = index % 7 >= 5;
              const clickable = canOpenDay(date);
              return (
                <div
                  key={date}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={() => clickable && setOpenDay(date)}
                  onKeyDown={(event) => event.key === "Enter" && clickable && setOpenDay(date)}
                  className={cn(
                    "group relative flex min-h-[116px] flex-col gap-1 border-b border-slate-200 p-1.5 text-left transition-colors",
                    index % 7 !== 6 && "border-r",
                    index >= days.length - 7 && "border-b-0",
                    holiday ? "bg-amber-50" : isToday ? "bg-teal-50/70" : !inMonth(date) ? "bg-slate-50" : weekend ? "bg-slate-50/50" : "bg-white",
                    clickable && "cursor-pointer hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[13px] font-bold",
                        isToday
                          ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-[0_4px_10px_-3px_rgba(13,148,136,0.7)]"
                          : !inMonth(date)
                            ? "text-slate-300"
                            : weekend
                              ? "text-rose-500"
                              : "text-slate-700"
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {holiday ? <span className="truncate rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{holiday.name}</span> : null}
                    {isTeacher ? (
                      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-teal-600 opacity-0 transition group-hover:opacity-100" aria-hidden>
                        <Plus size={15} />
                      </span>
                    ) : null}
                  </div>
                  {dayEvents.slice(0, MAX_PER_CELL).map((event) => (
                    <EventPill key={event.id} event={event} onOpen={setSelected} />
                  ))}
                  {dayEvents.length > MAX_PER_CELL ? (
                    <span className="px-1.5 text-[11px] font-bold text-slate-500 hover:text-teal-700">+{dayEvents.length - MAX_PER_CELL} buổi nữa</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danh sách theo ngày (điện thoại) */}
        <div className="divide-y divide-slate-100 md:hidden">
          {days
            .filter((date) => inMonth(date) && (eventsByDay.has(date) || holidayByDay.has(date) || date === today))
            .map((date) => (
              <div key={date} className={cn("flex gap-3 p-4", date === today && "bg-teal-50/50")}>
                <div className="w-12 shrink-0 text-center">
                  <p className={cn("text-[11px] font-bold uppercase", weekdayIndex(date) >= 5 ? "text-rose-400" : "text-slate-400")}>{WEEKDAY_SHORT[weekdayIndex(date)]}</p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex h-9 w-9 items-center justify-center rounded-full text-lg font-black",
                      date === today ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white" : "text-slate-900"
                    )}
                  >
                    {Number(date.slice(8))}
                  </p>
                </div>
                <div className="grid min-w-0 flex-1 content-start gap-1.5">
                  {holidayByDay.get(date) ? <span className="w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{holidayByDay.get(date)!.name}</span> : null}
                  {(eventsByDay.get(date) ?? []).map((event) => (
                    <EventPill key={event.id} event={event} onOpen={setSelected} large />
                  ))}
                  {!eventsByDay.get(date)?.length && !holidayByDay.get(date) ? <p className="pt-2 text-sm text-slate-400">Không có buổi học</p> : null}
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Cột bên: hôm nay, sắp tới, lớp học */}
      <aside className="grid content-start gap-4">
        <section className="surface overflow-hidden">
          <div className="bg-brand relative overflow-hidden px-5 py-4 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.3),transparent_45%)]" />
            <p className="relative text-xs font-bold uppercase tracking-wider text-white/80">Hôm nay</p>
            <p className="relative text-lg font-black">
              {WEEKDAY_LABELS[weekdayIndex(today)]}, {formatDay(today)}
            </p>
          </div>
          <div className="grid gap-2 p-3">
            {todayEvents.length ? (
              todayEvents.map((event) => <AgendaItem key={event.id} event={event} now={now} onOpen={setSelected} />)
            ) : (
              <p className="px-2 py-4 text-center text-sm text-slate-500">Hôm nay không có buổi học 🎈</p>
            )}
          </div>
        </section>

        <section className="surface p-4">
          <h3 className="mb-3 text-sm font-black text-slate-950">Sắp tới</h3>
          {upcoming.length ? (
            <div className="grid gap-2">
              {upcoming.map((event) => (
                <AgendaItem key={event.id} event={event} now={now} onOpen={setSelected} showDate />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có buổi nào sắp tới trong tháng này.</p>
          )}
        </section>

        {classes.length ? (
          <section className="surface p-4">
            <h3 className="mb-3 text-sm font-black text-slate-950">Lớp học</h3>
            <div className="grid gap-2">
              {classes.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 text-sm">
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", CLASS_COLORS[item.colorIndex % CLASS_COLORS.length].dot)} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.name}</span>
                  <span className="text-xs font-bold text-slate-400">{monthCountByClass.get(item.id) ?? 0} buổi</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <Legend className="bg-slate-300" label="Đã huỷ" />
              <Legend className="bg-amber-300" label="Ngày nghỉ" />
            </div>
          </section>
        ) : null}
      </aside>

      {/* Hộp thoại: danh sách buổi trong ngày */}
      <Dialog open={Boolean(openDay)} onClose={() => setOpenDay(null)} title={openDay ? `${WEEKDAY_LABELS[weekdayIndex(openDay)]}, ${formatDay(openDay)}` : ""} description={openDay ? holidayByDay.get(openDay)?.name : undefined}>
        <div className="grid gap-2">
          {(openDay ? eventsByDay.get(openDay) ?? [] : []).map((event) => (
            <EventPill key={event.id} event={event} large onOpen={(value) => { setOpenDay(null); setSelected(value); }} />
          ))}
          {openDay && !eventsByDay.get(openDay)?.length ? <p className="text-sm text-slate-500">Chưa có buổi học nào trong ngày này.</p> : null}
          {isTeacher && openDay ? (
            <button
              type="button"
              onClick={() => { setForm({ date: openDay }); setOpenDay(null); }}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
            >
              <CalendarPlus size={16} />
              Thêm buổi học ngày này
            </button>
          ) : null}
        </div>
      </Dialog>

      {/* Hộp thoại: chi tiết buổi học */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? selected.occurrence.title || selected.className : ""} description={selected ? selected.className : undefined}>
        {selected ? (
          <SessionDetail
            event={selected}
            isTeacher={isTeacher}
            rosterSize={rosters[selected.occurrence.classId]?.length ?? 0}
            onEdit={() => { setForm({ event: selected }); setSelected(null); }}
            onAttendance={() => { setAttendanceFor(selected); setSelected(null); }}
            onDone={done}
          />
        ) : null}
      </Dialog>

      {/* Hộp thoại: điểm danh */}
      <Dialog
        open={Boolean(attendanceFor)}
        onClose={() => setAttendanceFor(null)}
        title="Điểm danh"
        description={attendanceFor ? `${attendanceFor.occurrence.title || attendanceFor.className} · ${formatDay(attendanceFor.occurrence.date)} · ${attendanceFor.occurrence.start}` : undefined}
      >
        {attendanceFor ? (
          <AttendanceForm
            key={attendanceFor.id}
            event={attendanceFor}
            roster={rosters[attendanceFor.occurrence.classId] ?? []}
            onDone={(result) => { setAttendanceFor(null); done(result); }}
          />
        ) : null}
      </Dialog>

      {/* Hộp thoại: thêm / sửa buổi */}
      <Dialog open={Boolean(form)} onClose={() => setForm(null)} title={form?.event ? "Sửa buổi học" : "Thêm buổi học"}>
        {form ? <SessionForm key={form.event?.id ?? form.date} event={form.event} date={form.date} classes={classes} onDone={done} /> : null}
      </Dialog>

      {/* Hộp thoại: lịch cố định */}
      <Dialog open={setupOpen} onClose={() => setSetupOpen(false)} title="Xếp lịch cố định" description="Hệ thống tự tạo buổi học mỗi tuần theo lịch này." className="max-w-2xl">
        <SetupForm classes={classes} schedules={schedules} today={today} onDone={done} />
      </Dialog>

      {/* Hộp thoại: ngày nghỉ */}
      <Dialog open={holidayOpen} onClose={() => setHolidayOpen(false)} title="Ngày nghỉ" description="Buổi học theo lịch cố định rơi vào ngày nghỉ sẽ tự nghỉ.">
        <HolidayManager holidays={holidays} onDone={(result) => setFlash({ ...result })} />
      </Dialog>

      <Toast result={flash} />
    </div>
  );
}

function EventPill({ event, onOpen, large }: { event: CalendarEvent; onOpen: (event: SessionEvent) => void; large?: boolean }) {
  const cancelled = event.occurrence.status === "cancelled";
  const color = CLASS_COLORS[event.colorIndex % CLASS_COLORS.length];
  const marked = event.attendance && Object.keys(event.attendance).length;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(event);
      }}
      title={`${event.occurrence.start}–${event.occurrence.end} ${event.occurrence.title || event.className}`}
      className={cn(
        "flex w-full items-center gap-1.5 truncate rounded-md border-l-[3px] text-left font-semibold transition",
        large ? "px-3 py-2 text-sm" : "px-1.5 py-1 text-[11px] leading-tight",
        cancelled ? "border-l-slate-300 bg-slate-100 text-slate-400 line-through hover:bg-slate-200" : cn(color.soft, color.bar, color.text)
      )}
    >
      <span className="shrink-0 font-black tabular-nums">{event.occurrence.start}</span>
      <span className="truncate">{event.occurrence.title || event.className}</span>
      {large ? <span className="ml-auto shrink-0 text-xs font-medium opacity-70">{event.className}</span> : null}
      {marked ? <CheckCircle2 size={large ? 14 : 11} className={cn("shrink-0 opacity-70", !large && "ml-auto")} aria-label="Đã điểm danh" /> : null}
    </button>
  );
}

function AgendaItem({ event, now, onOpen, showDate }: { event: SessionEvent; now: number | null; onOpen: (event: SessionEvent) => void; showDate?: boolean }) {
  const occurrence = event.occurrence;
  const color = CLASS_COLORS[event.colorIndex % CLASS_COLORS.length];
  const cancelled = occurrence.status === "cancelled";
  const live = now !== null && !cancelled && now >= occurrenceStart(occurrence) && now <= occurrenceEnd(occurrence);
  const ended = now !== null && now > occurrenceEnd(occurrence);
  const joinSoon = now !== null && now >= occurrenceStart(occurrence) - JOIN_EARLY_MS;
  const online = occurrence.mode === "online";
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-2.5 transition hover:border-slate-200 hover:bg-slate-50", cancelled && "opacity-60")}>
      <button type="button" onClick={() => onOpen(event)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className={cn("w-1 self-stretch rounded-full", cancelled ? "bg-slate-300" : color.dot)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            {showDate ? `${WEEKDAY_SHORT[weekdayIndex(occurrence.date)]} ${occurrence.date.slice(8)}/${occurrence.date.slice(5, 7)} · ` : ""}
            {occurrence.start}–{occurrence.end}
            {live ? <span className="rounded-full bg-rose-100 px-1.5 text-[10px] font-black text-rose-600">ĐANG HỌC</span> : null}
          </span>
          <span className={cn("block truncate text-sm font-bold text-slate-900", cancelled && "line-through")}>{occurrence.title || event.className}</span>
          <span className="flex items-center gap-1 truncate text-xs text-slate-500">
            {occurrence.mode === "online" ? <Video size={12} /> : <MapPin size={12} />}
            {event.className}
            {occurrence.mode === "offline" && occurrence.location ? ` · ${occurrence.location}` : ""}
          </span>
        </span>
      </button>
      {!cancelled && !ended && online ? (
        occurrence.meetingUrl ? (
          <a
            href={occurrence.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition",
              joinSoon ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_6px_14px_-6px_rgba(13,148,136,0.8)]" : "border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
            )}
          >
            <ExternalLink size={13} />
            {joinSoon ? "Vào học" : "Link học"}
          </a>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold text-slate-400">Chưa có link học</span>
        )
      ) : null}
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-800"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function SessionDetail({
  event,
  isTeacher,
  rosterSize,
  onEdit,
  onAttendance,
  onDone
}: {
  event: SessionEvent;
  isTeacher: boolean;
  rosterSize: number;
  onEdit: () => void;
  onAttendance: () => void;
  onDone: (result: NonNullable<ActionResult>) => void;
}) {
  const occurrence = event.occurrence;
  const cancelled = occurrence.status === "cancelled";
  const now = Date.now();
  const startMs = occurrenceStart(occurrence);
  const endMs = occurrenceEnd(occurrence);
  const canJoin = !cancelled && occurrence.mode === "online" && occurrence.meetingUrl && now >= startMs - JOIN_EARLY_MS && now <= endMs;
  const started = now >= startMs;
  const marked = event.attendance ? Object.values(event.attendance) : [];
  const absentCount = marked.filter((status) => status === "absent").length;
  const target = {
    classId: occurrence.classId,
    sessionId: occurrence.sessionId,
    scheduleId: occurrence.scheduleId,
    originalDate: occurrence.originalDate,
    date: occurrence.date,
    start: occurrence.start,
    end: occurrence.end
  };

  return (
    <div className="grid gap-4">
      {cancelled ? <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Buổi học này đã bị huỷ.</p> : null}
      <div className="grid gap-2.5 text-sm text-slate-700">
        <InfoRow icon={Clock3}>
          {WEEKDAY_LABELS[weekdayIndex(occurrence.date)]}, {formatDay(occurrence.date)} · {occurrence.start}–{occurrence.end}
        </InfoRow>
        <InfoRow icon={occurrence.mode === "online" ? Video : MapPin}>
          {occurrence.mode === "online" ? "Học online" : "Học tại lớp"}
          {occurrence.location ? ` · ${occurrence.location}` : ""}
        </InfoRow>
        {occurrence.note ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{occurrence.note}</p> : null}
        {occurrence.scheduleId ? <p className="text-xs text-slate-400">Buổi theo lịch cố định hằng tuần</p> : <p className="text-xs text-slate-400">Buổi học thêm</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {occurrence.mode === "online" && !occurrence.meetingUrl && !cancelled && now <= endMs ? (
          <p className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-500">{isTeacher ? "Buổi online chưa có link học. Bấm Sửa để thêm link." : "Giáo viên chưa gửi link học cho buổi này."}</p>
        ) : null}
        {occurrence.mode === "online" && occurrence.meetingUrl && !cancelled && now <= endMs ? (
          <a
            href={occurrence.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
              canJoin ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)]" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <ExternalLink size={16} />
            {canJoin ? "Vào học ngay" : "Mở link học"}
          </a>
        ) : null}
        {event.recordingUrl ? (
          <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100">
            <PlayCircle size={16} />
            Xem record
          </a>
        ) : null}
      </div>

      {!isTeacher && event.myAttendance ? (
        <p
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold",
            event.myAttendance === "present" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          {event.myAttendance === "present" ? <CheckCircle2 size={17} /> : <UserX size={17} />}
          Điểm danh: {event.myAttendance === "present" ? "Có mặt" : "Vắng"}
        </p>
      ) : null}

      {isTeacher && !cancelled ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
          <div className="min-w-0 text-sm">
            <p className="font-bold text-slate-900">Điểm danh</p>
            <p className="text-xs text-slate-500">
              {marked.length
                ? `${marked.length - absentCount} có mặt · ${absentCount} vắng`
                : started
                  ? `Chưa điểm danh · ${rosterSize} học sinh`
                  : "Điểm danh được khi buổi học bắt đầu"}
            </p>
          </div>
          <button
            type="button"
            onClick={onAttendance}
            disabled={!started || !rosterSize}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)] disabled:pointer-events-none disabled:opacity-40"
          >
            <ClipboardCheck size={16} />
            {marked.length ? "Sửa điểm danh" : "Điểm danh"}
          </button>
        </div>
      ) : null}

      {isTeacher ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onEdit} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <PencilLine size={16} />
            Sửa
          </button>
          <ActionForm action={setSessionStatus.bind(null, target, cancelled ? "scheduled" : "cancelled")} onSuccess={onDone}>
            <SubmitButton variant="secondary" pendingText="Đang lưu..." confirmMessage={cancelled ? undefined : "Huỷ buổi học này? Học sinh sẽ thấy buổi bị gạch."}>
              {cancelled ? <RotateCcw size={16} /> : <XCircle size={16} />}
              {cancelled ? "Khôi phục" : "Huỷ buổi"}
            </SubmitButton>
          </ActionForm>
          {occurrence.sessionId ? (
            <ActionForm action={deleteSession.bind(null, occurrence.classId, occurrence.sessionId)} onSuccess={onDone}>
              <SubmitButton
                variant="secondary"
                className="text-rose-600"
                pendingText="Đang xoá..."
                confirmMessage={occurrence.scheduleId ? "Bỏ các thay đổi riêng, đưa buổi này về theo lịch cố định?" : "Xoá buổi học thêm này?"}
              >
                <Trash2 size={16} />
                {occurrence.scheduleId ? "Về lịch gốc" : "Xoá buổi"}
              </SubmitButton>
            </ActionForm>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AttendanceForm({ event, roster, onDone }: { event: SessionEvent; roster: RosterStudent[]; onDone: (result: NonNullable<ActionResult>) => void }) {
  // Mặc định Có mặt; giữ kết quả cũ nếu đã điểm danh.
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((student) => [student.id, event.attendance?.[student.id] ?? "present"]))
  );
  const absent = Object.values(statuses).filter((status) => status === "absent").length;
  const occurrence = event.occurrence;
  const target = {
    classId: occurrence.classId,
    sessionId: occurrence.sessionId,
    scheduleId: occurrence.scheduleId,
    originalDate: occurrence.originalDate,
    date: occurrence.date,
    start: occurrence.start,
    end: occurrence.end
  };

  return (
    <ActionForm action={saveAttendance.bind(null, target)} onSuccess={onDone} className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          <span className="text-emerald-600">{roster.length - absent} có mặt</span> · <span className="text-rose-600">{absent} vắng</span>
        </p>
        <button
          type="button"
          onClick={() => setStatuses(Object.fromEntries(roster.map((student) => [student.id, "present" as const])))}
          className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-50"
        >
          Tất cả có mặt
        </button>
      </div>
      <ul className="grid gap-1.5">
        {roster.map((student, index) => {
          const status = statuses[student.id];
          return (
            <li key={student.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 transition", status === "absent" ? "bg-rose-50" : "bg-slate-50")}>
              <span className="w-5 text-right text-xs font-bold text-slate-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{student.name}</span>
              <input type="hidden" name={`status_${student.id}`} value={status} />
              <div className="flex shrink-0 rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
                {(["present", "absent"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatuses({ ...statuses, [student.id]: value })}
                    aria-pressed={status === value}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-bold transition",
                      status === value ? (value === "present" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {value === "present" ? "Có mặt" : "Vắng"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <SubmitButton className="w-full">Lưu điểm danh</SubmitButton>
    </ActionForm>
  );
}

function SessionForm({ event, date, classes, onDone }: { event?: SessionEvent; date?: string; classes: CalendarClass[]; onDone: (result: NonNullable<ActionResult>) => void }) {
  const occurrence = event?.occurrence;
  const [mode, setMode] = useState<"online" | "offline">(occurrence?.mode ?? "online");
  return (
    <ActionForm action={saveSession} onSuccess={onDone} className="grid gap-4">
      {occurrence?.sessionId ? <input type="hidden" name="session_id" value={occurrence.sessionId} /> : null}
      {occurrence?.scheduleId && !occurrence.sessionId ? (
        <>
          <input type="hidden" name="schedule_id" value={occurrence.scheduleId} />
          <input type="hidden" name="original_date" value={occurrence.originalDate ?? occurrence.date} />
        </>
      ) : null}
      {occurrence ? <input type="hidden" name="status" value={occurrence.status} /> : null}
      {occurrence ? (
        <input type="hidden" name="class_id" value={occurrence.classId} />
      ) : (
        <Field label="Lớp">
          <Select name="class_id" required defaultValue={classes[0]?.id}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Ngày">
          <Input name="session_date" type="date" required defaultValue={occurrence?.date ?? date} />
        </Field>
        <Field label="Bắt đầu">
          <Input name="start_time" type="time" required defaultValue={occurrence?.start ?? "19:00"} />
        </Field>
        <Field label="Kết thúc">
          <Input name="end_time" type="time" required defaultValue={occurrence?.end ?? "21:00"} />
        </Field>
      </div>
      <Field label="Tên buổi (không bắt buộc)">
        <Input name="title" placeholder="VD: Chữa đề thi thử số 3" defaultValue={occurrence?.title ?? ""} />
      </Field>
      <ModeFields mode={mode} setMode={setMode} meetingUrl={occurrence?.meetingUrl} location={occurrence?.location} />
      <Field label="Ghi chú">
        <Textarea name="note" className="min-h-20" placeholder="VD: Mang máy tính cầm tay" defaultValue={occurrence?.note ?? ""} />
      </Field>
      <SubmitButton className="w-full">{event ? "Lưu thay đổi" : "Thêm buổi học"}</SubmitButton>
    </ActionForm>
  );
}

function SetupForm({ classes, schedules, today, onDone }: { classes: CalendarClass[]; schedules: ScheduleRow[]; today: string; onDone: (result: NonNullable<ActionResult>) => void }) {
  const [mode, setMode] = useState<"online" | "offline">("online");
  const classById = new Map(classes.map((item) => [item.id, item]));
  const visible = schedules.filter((schedule) => classById.has(schedule.class_id)).sort((a, b) => a.class_id.localeCompare(b.class_id) || a.weekday - b.weekday);

  return (
    <div className="grid gap-6">
      {visible.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lịch đang áp dụng</p>
          {visible.map((schedule) => {
            const classInfo = classById.get(schedule.class_id)!;
            return (
              <div key={schedule.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", CLASS_COLORS[classInfo.colorIndex % CLASS_COLORS.length].dot)} />
                <p className="min-w-0 flex-1 truncate text-sm">
                  <strong>{classInfo.name}</strong> · {WEEKDAY_LABELS[schedule.weekday - 1]} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)} ·{" "}
                  {schedule.mode === "online" ? "Online" : schedule.location || "Tại lớp"}
                  {schedule.ends_on ? ` · đến ${formatDay(schedule.ends_on)}` : ""}
                </p>
                <form action={deleteClassSchedule.bind(null, schedule.id)}>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Xoá lịch"
                    onClick={(e) => {
                      if (!window.confirm("Xoá lịch cố định này? Các buổi sắp tới theo lịch này sẽ biến mất khỏi lịch.")) e.preventDefault();
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : null}

      <ActionForm action={saveClassSchedule} onSuccess={onDone} className="grid gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Thêm lịch mới</p>
        <Field label="Lớp">
          <Select name="class_id" required defaultValue={classes[0]?.id}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-700">Học vào các thứ</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_SHORT.map((label, index) => (
              <label key={label} className="cursor-pointer">
                <input type="checkbox" name="weekdays" value={index + 1} className="peer sr-only" />
                <span className="flex h-10 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bắt đầu">
            <Input name="start_time" type="time" required defaultValue="19:00" />
          </Field>
          <Field label="Kết thúc">
            <Input name="end_time" type="time" required defaultValue="21:00" />
          </Field>
        </div>
        <ModeFields mode={mode} setMode={setMode} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Áp dụng từ ngày">
            <Input name="starts_on" type="date" required defaultValue={today} />
          </Field>
          <Field label="Đến ngày (không bắt buộc)">
            <Input name="ends_on" type="date" />
          </Field>
        </div>
        <SubmitButton className="w-full">Lưu lịch cố định</SubmitButton>
      </ActionForm>
    </div>
  );
}

function HolidayManager({ holidays, onDone }: { holidays: HolidayRow[]; onDone: (result: NonNullable<ActionResult>) => void }) {
  return (
    <div className="grid gap-5">
      <ActionForm action={addHoliday} onSuccess={onDone} className="grid gap-3">
        <Field label="Tên ngày nghỉ">
          <Input name="name" required placeholder="VD: Quốc khánh" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Từ ngày">
            <Input name="from" type="date" required />
          </Field>
          <Field label="Đến ngày (không bắt buộc)">
            <Input name="to" type="date" />
          </Field>
        </div>
        <SubmitButton className="w-full">Thêm ngày nghỉ</SubmitButton>
      </ActionForm>
      {holidays.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ngày nghỉ trong tháng</p>
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-sm">
                <strong>{formatDay(holiday.holiday_date)}</strong> · {holiday.name}
              </p>
              <form action={deleteHoliday.bind(null, holiday.id)}>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-100" aria-label="Xoá ngày nghỉ">
                  <Trash2 size={15} />
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModeFields({ mode, setMode, meetingUrl, location }: { mode: "online" | "offline"; setMode: (mode: "online" | "offline") => void; meetingUrl?: string | null; location?: string | null }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {(["online", "offline"] as const).map((value) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="peer sr-only" />
            <span className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-800">
              {value === "online" ? <Video size={16} /> : <MapPin size={16} />}
              {value === "online" ? "Online" : "Tại lớp"}
            </span>
          </label>
        ))}
      </div>
      {mode === "online" ? (
        <Field label="Link vào học (Zoom / Google Meet...)">
          <Input name="meeting_url" type="url" placeholder="https://meet.google.com/..." defaultValue={meetingUrl ?? ""} />
        </Field>
      ) : (
        <Field label="Phòng học / địa điểm">
          <Input name="location" placeholder="VD: Phòng 203" defaultValue={location ?? ""} />
        </Field>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function InfoRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        <Icon size={16} />
      </span>
      {children}
    </p>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-full", className)} />
      {label}
    </span>
  );
}

function weekdayIndex(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function formatDay(date: string) {
  return `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}
