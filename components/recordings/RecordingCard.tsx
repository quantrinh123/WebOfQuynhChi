import { CalendarDays, Link2, Play, Video } from "lucide-react";
import { cn, formatDate } from "@/lib/utils/format";

type Recording = { id: string; title: string; url: string; recorded_at: string | null; created_at: string };

// Thẻ buổi học: ảnh bìa YouTube nếu có, nếu không thì hiện biểu tượng theo nền tảng.
export function RecordingCard({ recording, action }: { recording: Recording; action?: React.ReactNode }) {
  const platform = detectPlatform(recording.url);
  return (
    <article className="surface group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)]">
      <a href={recording.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video overflow-hidden" aria-label={`Xem ${recording.title}`}>
        {platform.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={platform.thumbnail} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", platform.tone)}>
            <platform.icon size={44} className="text-white/90" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 backdrop-blur">{platform.name}</span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-teal-700 shadow-xl">
            <Play size={24} className="ml-1" fill="currentColor" />
          </span>
        </span>
      </a>
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-bold leading-snug text-slate-950">{recording.title}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarDays size={13} />
            {formatDate(recording.recorded_at ?? recording.created_at)}
          </p>
        </div>
        {action}
      </div>
    </article>
  );
}

function detectPlatform(url: string): { name: string; icon: React.ElementType; tone: string; thumbnail?: string } {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Link không hợp lệ: coi như link thường.
  }
  const youtubeId = /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url)?.[1];
  if (youtubeId) return { name: "YouTube", icon: Play, tone: "from-rose-500 to-red-600", thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` };
  if (host.endsWith("drive.google.com")) return { name: "Google Drive", icon: Play, tone: "from-emerald-500 to-sky-500" };
  if (host.endsWith("zoom.us")) return { name: "Zoom", icon: Video, tone: "from-sky-500 to-blue-600" };
  if (host.endsWith("meet.google.com")) return { name: "Google Meet", icon: Video, tone: "from-teal-500 to-emerald-600" };
  if (host.endsWith("facebook.com") || host.endsWith("fb.watch")) return { name: "Facebook", icon: Play, tone: "from-blue-500 to-indigo-600" };
  return { name: host || "Link", icon: Link2, tone: "from-indigo-500 to-cyan-500" };
}
