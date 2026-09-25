import { occurrenceEnd, occurrenceStart } from "@/lib/schedule";
import type { CalendarEvent } from "@/lib/schedule-data";

// Tạo nội dung file .ics (chuẩn iCalendar RFC 5545) cho Google Calendar đăng ký theo dõi.
export function buildIcs(input: { calendarName: string; events: CalendarEvent[]; now?: number }) {
  const stamp = toIcsTime(input.now ?? Date.now());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Luyen thi Toan//Lich hoc//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(input.calendarName)}`,
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H"
  ];

  for (const event of input.events) {
    const occurrence = event.occurrence;
    const title = occurrence.title ? `${occurrence.title} · ${event.className}` : event.className;
    const place = occurrence.mode === "online" ? occurrence.meetingUrl ?? "Học online" : occurrence.location ?? "Học tại lớp";
    const description = [
      occurrence.mode === "online" ? (occurrence.meetingUrl ? `Vào học: ${occurrence.meetingUrl}` : "Học online") : `Học tại lớp${occurrence.location ? `: ${occurrence.location}` : ""}`,
      occurrence.note,
      event.recordingUrl ? `Xem record: ${event.recordingUrl}` : null
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      // UID cố định theo buổi gốc để khi dời / sửa buổi, Google cập nhật đúng sự kiện cũ.
      `UID:${eventUid(event)}@luyenthitoan`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsTime(occurrenceStart(occurrence))}`,
      `DTEND:${toIcsTime(occurrenceEnd(occurrence))}`,
      `SUMMARY:${escapeText(occurrence.status === "cancelled" ? `[Đã huỷ] ${title}` : title)}`,
      `LOCATION:${escapeText(place)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `STATUS:${occurrence.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:OPAQUE"
    );
    if (occurrence.mode === "online" && occurrence.meetingUrl) lines.push(`URL:${occurrence.meetingUrl}`);
    if (occurrence.status !== "cancelled") {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(title)}`, "TRIGGER:-PT60M", "END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

function eventUid(event: CalendarEvent) {
  const occurrence = event.occurrence;
  return occurrence.scheduleId && occurrence.originalDate ? `${occurrence.scheduleId}-${occurrence.originalDate}` : occurrence.sessionId ?? event.id;
}

function toIcsTime(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Dòng dài hơn 75 byte phải gập lại (dòng tiếp theo bắt đầu bằng dấu cách), không cắt giữa ký tự UTF-8.
function foldLine(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = encoder.encode(char).length;
    const limit = parts.length ? 74 : 75;
    if (size + charSize > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.map((part, index) => (index ? ` ${part}` : part)).join("\r\n");
}
