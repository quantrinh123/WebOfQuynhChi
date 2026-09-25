import { cn, formatScore } from "@/lib/utils/format";
import type { SectionSummary, TopicSummary } from "@/lib/analysis";

export function SectionBreakdown({ sections, showScore = true }: { sections: SectionSummary[]; showScore?: boolean }) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      {sections.map((section) => {
        const rate = section.total ? Math.round((section.correct / section.total) * 100) : 0;
        return (
          <div key={section.key} className="surface p-4">
            <p className="text-sm font-semibold text-slate-600">{section.title}</p>
            {showScore ? (
              <p className="mt-2 text-2xl font-bold">
                {formatScore(section.score)}
                <span className="text-base font-semibold text-slate-500">/{formatScore(section.maxScore)} điểm</span>
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold">{rate}% <span className="text-base font-semibold text-slate-500">đúng</span></p>
            )}
            <RateBar rate={rate} />
            <p className="mt-2 text-sm text-slate-600">
              Đúng <strong className="text-emerald-700">{section.correct}</strong> · Sai <strong className="text-rose-700">{section.wrong}</strong> · Bỏ trống{" "}
              <strong className="text-slate-900">{section.blank}</strong> / {section.total} {section.key === "true_false" ? "ý" : "câu"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function TopicBreakdown({ topics, title = "Phân tích theo chủ đề" }: { topics: TopicSummary[]; title?: string }) {
  return (
    <section className="table-shell mb-6">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">Chủ đề có tỉ lệ đúng thấp nhất ở trên cùng. Dưới 50% là chủ đề cần ôn lại.</p>
      </div>
      {!topics.length ? (
        <div className="p-4 text-sm text-slate-600">Chưa có dữ liệu.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="p-3">Chủ đề</th>
                <th className="p-3">Đúng</th>
                <th className="p-3 w-1/3">Tỉ lệ đúng</th>
                <th className="p-3">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.topic} className="border-t">
                  <td className="p-3 font-medium">{topic.topic}</td>
                  <td className="p-3">{topic.correct}/{topic.total}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <RateBar rate={topic.rate} className="mt-0 flex-1" />
                      <span className="w-10 text-right font-semibold">{topic.rate}%</span>
                    </div>
                  </td>
                  <td className="p-3"><RateLabel rate={topic.rate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function rateColor(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function RateBar({ rate, className }: { rate: number; className?: string }) {
  return (
    <div className={cn("mt-3 h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full", rateColor(rate))} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
    </div>
  );
}

function RateLabel({ rate }: { rate: number }) {
  if (rate >= 80) return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">Tốt</span>;
  if (rate >= 50) return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Khá</span>;
  return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">Cần ôn lại</span>;
}
