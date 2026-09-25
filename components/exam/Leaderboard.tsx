import { Medal, Trophy } from "lucide-react";
import { cn, formatScore } from "@/lib/utils/format";

type RankableSubmission = {
  id: string;
  student_id: string;
  status: string;
  final_score: number | string | null;
  started_at: string | null;
  submitted_at: string | null;
  profiles?: { full_name: string | null } | null;
};

export type LeaderboardRow = {
  id: string;
  studentId: string;
  name: string;
  score: number;
  durationMs: number | null;
  rank: number;
};

// Xếp theo điểm cao nhất, nếu bằng điểm thì ai làm nhanh hơn xếp trên.
export function rankSubmissions(submissions: RankableSubmission[]): LeaderboardRow[] {
  const rows = submissions
    .filter((item) => item.status !== "doing")
    .map((item) => ({
      id: item.id,
      studentId: item.student_id,
      name: item.profiles?.full_name ?? "-",
      score: Number(item.final_score ?? 0),
      durationMs:
        item.started_at && item.submitted_at ? Math.max(0, new Date(item.submitted_at).getTime() - new Date(item.started_at).getTime()) : null,
      rank: 0
    }))
    .sort((a, b) => b.score - a.score || (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity));

  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    row.rank = previous && previous.score === row.score && previous.durationMs === row.durationMs ? previous.rank : index + 1;
  });
  return rows;
}

export function Leaderboard({
  rows,
  limit = 10,
  highlightStudentId,
  description
}: {
  rows: LeaderboardRow[];
  limit?: number;
  highlightStudentId?: string;
  description?: string;
}) {
  const top = rows.slice(0, limit);
  const ownRow = highlightStudentId ? rows.find((row) => row.studentId === highlightStudentId) : undefined;
  const showOwnRowSeparately = ownRow && !top.includes(ownRow);

  return (
    <section className="table-shell mb-6">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy size={20} />
        </div>
        <div>
          <h2 className="font-semibold">Bảng xếp hạng</h2>
          <p className="text-sm text-slate-600">{description ?? "Xếp theo điểm cao nhất, bằng điểm thì ai làm nhanh hơn xếp trên."}</p>
        </div>
      </div>
      {!rows.length ? (
        <div className="p-4 text-sm text-slate-600">Chưa có học sinh nào nộp bài.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-3">Hạng</th>
                <th className="p-3">Học sinh</th>
                <th className="p-3">Điểm</th>
                <th className="p-3">Thời gian làm</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <LeaderboardTableRow key={row.id} row={row} highlighted={row.studentId === highlightStudentId} />
              ))}
              {showOwnRowSeparately ? (
                <>
                  <tr className="border-t">
                    <td colSpan={4} className="p-2 text-center text-slate-400">…</td>
                  </tr>
                  <LeaderboardTableRow row={ownRow} highlighted />
                </>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LeaderboardTableRow({ row, highlighted }: { row: LeaderboardRow; highlighted?: boolean }) {
  const medalColor = row.rank === 1 ? "text-amber-500" : row.rank === 2 ? "text-slate-400" : row.rank === 3 ? "text-orange-600" : null;
  return (
    <tr className={cn("border-t", highlighted && "bg-teal-50")}>
      <td className="p-3 font-bold">
        <span className="inline-flex items-center gap-1.5">
          {medalColor ? <Medal size={16} className={medalColor} /> : null}
          {row.rank}
        </span>
      </td>
      <td className="p-3 font-medium">
        {row.name}
        {highlighted ? <span className="ml-2 text-xs font-bold text-teal-700">(Bạn)</span> : null}
      </td>
      <td className="p-3 font-semibold">{formatScore(row.score)}</td>
      <td className="p-3">{formatDuration(row.durationMs)}</td>
    </tr>
  );
}

function formatDuration(ms: number | null) {
  if (ms === null) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} phút ${seconds.toString().padStart(2, "0")} giây`;
}
