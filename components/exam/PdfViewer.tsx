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

  return <iframe src={viewerUrl} title="PDF" className={className ?? "w-full rounded-2xl border border-slate-300 bg-white"} style={{ height }} />;
}
