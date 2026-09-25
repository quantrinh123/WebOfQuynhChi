import { cn, formatScore } from "@/lib/utils/format";

// Vòng điểm có hiệu ứng chạy khi hiện ra; màu theo mức điểm trên thang tối đa.
export function ScoreRing({
  id,
  score,
  max = 10,
  size = 120,
  stroke = 3,
  showMax = true,
  className
}: {
  id: string;
  score: number;
  max?: number;
  size?: number;
  stroke?: number;
  showMax?: boolean;
  className?: string;
}) {
  const ratio = max ? Math.min(1, Math.max(0, score / max)) : 0;
  const radius = 15.5;
  const circumference = 2 * Math.PI * radius;
  const [from, to] = scoreColors(ratio);
  const gradientId = `ring-${id}`;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="animate-ring"
          style={{ ["--ring-full" as string]: circumference, ["--ring-offset" as string]: circumference * (1 - ratio), strokeDashoffset: circumference * (1 - ratio) }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black leading-none tracking-tight text-slate-950" style={{ fontSize: size * 0.24 }}>
          {formatScore(Math.round(score * 100) / 100)}
        </span>
        {showMax ? (
          <span className="font-semibold text-slate-400" style={{ fontSize: Math.max(10, size * 0.1) }}>
            /{formatScore(max)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function scoreColors(ratio: number): [string, string] {
  if (ratio >= 0.8) return ["#10b981", "#14b8a6"];
  if (ratio >= 0.65) return ["#14b8a6", "#06b6d4"];
  if (ratio >= 0.5) return ["#f59e0b", "#f97316"];
  return ["#f43f5e", "#ec4899"];
}

export function scoreMessage(ratio: number) {
  if (ratio >= 0.9) return { title: "Xuất sắc!", emoji: "🏆" };
  if (ratio >= 0.8) return { title: "Rất tốt!", emoji: "🌟" };
  if (ratio >= 0.65) return { title: "Khá tốt!", emoji: "💪" };
  if (ratio >= 0.5) return { title: "Đạt yêu cầu", emoji: "📚" };
  return { title: "Chưa đạt", emoji: "📝" };
}
