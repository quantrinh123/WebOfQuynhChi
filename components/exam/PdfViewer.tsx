export function PdfViewer({ fileUrl, height = 720, className }: { fileUrl?: string | null; height?: number | string; className?: string }) {
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm text-slate-500" style={{ height }}>
        Chưa có file PDF
      </div>
    );
  }

  const separator = fileUrl.includes("#") ? "&" : "#";
  const viewerUrl = `${fileUrl}${separator}zoom=page-width&view=FitH&pagemode=thumbs`;

  return (
    <div className="flex min-h-0 flex-col gap-2" style={{ height }}>
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:hidden">
        <span>Nếu dùng iPad không lướt được trang PDF, hãy mở file ở tab mới.</span>
        <a className="shrink-0 rounded-md bg-amber-600 px-2 py-1 font-semibold text-white" href={fileUrl} target="_blank" rel="noreferrer">
          Mở PDF
        </a>
      </div>
      <iframe src={viewerUrl} title="PDF" className={className ?? "min-h-0 flex-1 rounded-2xl border border-slate-300 bg-white"} />
    </div>
  );
}
