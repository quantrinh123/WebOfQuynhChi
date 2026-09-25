// Biểu đồ cột đơn chuỗi, thuần HTML/CSS: cột ≤ 24px, bo 4px ở đầu cột, lưới mảnh,
// tooltip khi rê chuột / focus bàn phím, kèm bảng số liệu để không phụ thuộc vào màu.
export type ColumnDatum = { key: string; label: string; value: number; tooltip: string };

export function ColumnChart({
  data,
  height = 180,
  valueLabel,
  showEveryNthLabel = 1,
  tableCaption
}: {
  data: ColumnDatum[];
  height?: number;
  valueLabel: string;
  showEveryNthLabel?: number;
  tableCaption: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((item) => item.value)));
  const ticks = [0, max / 2, max];

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative w-7 shrink-0 text-right text-[11px] tabular-nums text-slate-400" style={{ height }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (tick / max) * 100}%` }}>
              {formatTick(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${100 - (tick / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {data.map((item) => (
              <div
                key={item.key}
                tabIndex={0}
                aria-label={item.tooltip}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <div
                  className="w-full max-w-6 rounded-t bg-teal-500 transition-colors group-hover:bg-teal-600 group-focus-visible:bg-teal-600"
                  style={{ height: item.value ? `max(3px, ${(item.value / max) * 100}%)` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
                  <strong className="font-bold">{item.value}</strong> <span className="text-slate-300">{valueLabel}</span>
                  <div className="text-[11px] text-slate-400">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex gap-0.5 text-[11px] text-slate-400">
        {data.map((item, index) => (
          <span key={item.key} className="flex-1 truncate text-center">
            {index % showEveryNthLabel === 0 || index === data.length - 1 ? item.label : ""}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">Xem dạng bảng</summary>
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">{tableCaption}</caption>
          <tbody>
            {data.map((item) => (
              <tr key={item.key} className="border-t border-slate-100">
                <td className="py-1 text-slate-600">{item.label}</td>
                <td className="py-1 text-right font-semibold tabular-nums text-slate-900">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((item) => item * magnitude >= value) ?? 10;
  return step * magnitude;
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
