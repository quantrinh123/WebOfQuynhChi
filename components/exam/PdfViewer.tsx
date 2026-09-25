"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const PAGE_GAP = 12;

// Hiển thị PDF dạng cuộn liên tục: các trang xếp dọc, chỉ vẽ trang gần vùng nhìn thấy.
export function PdfViewer({ fileUrl, height = 720, className }: { fileUrl?: string | null; height?: number | string; className?: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1.414);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setStatus("loading");
    setPdf(null);
    setCurrentPage(1);

    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    loadingTask.promise
      .then(async (document) => {
        if (cancelled) return;
        const firstPage = await document.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        setAspectRatio(viewport.height / viewport.width);
        setPdf(document);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [fileUrl]);

  // Vẽ lại khi khung đổi kích thước (đổi bố cục, xoay màn hình, thu sidebar...).
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(frame);
      const width = Math.floor(entries[0].contentRect.width);
      // Khung bị ẩn (VD: chuyển tab trên điện thoại) thì giữ nguyên để không mất vị trí đang đọc.
      if (width > 0) frame = requestAnimationFrame(() => setContainerWidth(width));
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [status]);

  const pageWidth = Math.max(240, (containerWidth - 24) * zoom);
  const pageCount = pdf?.numPages ?? 0;

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element || !pageCount) return;
    const marker = element.scrollTop + element.clientHeight / 3;
    let page = 1;
    pageRefs.current.forEach((node, index) => {
      if (node && node.offsetTop <= marker) page = index + 1;
    });
    setCurrentPage(page);
  }, [pageCount]);

  function goToPage(page: number) {
    const target = pageRefs.current[Math.min(Math.max(page, 1), pageCount) - 1];
    if (target && scrollRef.current) scrollRef.current.scrollTo({ top: target.offsetTop - PAGE_GAP, behavior: "smooth" });
  }

  function changeZoom(next: number) {
    const element = scrollRef.current;
    const ratio = element && element.scrollHeight ? element.scrollTop / element.scrollHeight : 0;
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100)));
    // Giữ vị trí đang đọc sau khi phóng to / thu nhỏ.
    requestAnimationFrame(() => {
      if (element) element.scrollTop = ratio * element.scrollHeight;
    });
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm text-slate-500" style={{ height }}>
        Chưa có file PDF
      </div>
    );
  }

  return (
    <div className={className ?? "w-full rounded-2xl border border-slate-300 bg-white"} style={{ height }}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-2 py-1.5 text-sm">
          <div className="flex items-center gap-1">
            <ToolbarButton title="Trang trước" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
              <ChevronUp size={16} />
            </ToolbarButton>
            <span className="min-w-16 text-center text-xs font-bold text-slate-700">
              {pageCount ? `${currentPage} / ${pageCount}` : "- / -"}
            </span>
            <ToolbarButton title="Trang sau" disabled={!pageCount || currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)}>
              <ChevronDown size={16} />
            </ToolbarButton>
          </div>
          <div className="flex items-center gap-1">
            <ToolbarButton title="Thu nhỏ" disabled={zoom <= MIN_ZOOM} onClick={() => changeZoom(zoom - 0.2)}>
              <ZoomOut size={16} />
            </ToolbarButton>
            <button type="button" onClick={() => changeZoom(1)} className="min-w-12 rounded-md px-1 text-xs font-bold text-slate-700 hover:bg-slate-100" title="Vừa khung">
              {Math.round(zoom * 100)}%
            </button>
            <ToolbarButton title="Phóng to" disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(zoom + 0.2)}>
              <ZoomIn size={16} />
            </ToolbarButton>
            <ToolbarButton title="Vừa khung" disabled={zoom === 1} onClick={() => changeZoom(1)}>
              <Maximize2 size={15} />
            </ToolbarButton>
            <a
              className="ml-1 inline-flex h-8 items-center gap-1 rounded-md bg-teal-700 px-2 text-xs font-semibold text-white"
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              title="Mở file gốc"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">File gốc</span>
            </a>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-100 p-3 [-webkit-overflow-scrolling:touch]"
        >
          {status === "loading" ? <div className="py-10 text-center text-sm font-semibold text-slate-500">Đang tải đề...</div> : null}
          {status === "error" ? <div className="py-10 text-center text-sm font-semibold text-red-600">Không tải được PDF. Hãy bấm "File gốc".</div> : null}
          {pdf && containerWidth ? (
            <div className="mx-auto flex flex-col items-center" style={{ gap: PAGE_GAP, width: pageWidth }}>
              {Array.from({ length: pageCount }, (_, index) => (
                <PdfPage
                  key={index}
                  pdf={pdf}
                  pageNumber={index + 1}
                  width={pageWidth}
                  estimatedHeight={pageWidth * aspectRatio}
                  scrollRoot={scrollRef}
                  ref={(node) => {
                    pageRefs.current[index] = node;
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PdfPage({
  pdf,
  pageNumber,
  width,
  estimatedHeight,
  scrollRoot,
  ref
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  estimatedHeight: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  ref: (node: HTMLDivElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [height, setHeight] = useState(estimatedHeight);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), {
      root: scrollRoot.current,
      rootMargin: "1200px 0px"
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    const canvas = canvasRef.current;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / baseViewport.width });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setHeight(viewport.height);

      task = page.render({ canvasContext: context, canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
      await task.promise;
      if (!cancelled) setRendered(true);
    })().catch(() => {
      // Bỏ qua lỗi khi render bị huỷ do đổi kích thước.
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, width, visible]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        ref(node);
      }}
      className="relative shrink-0 overflow-hidden rounded bg-white shadow-sm"
      style={{ width, height }}
    >
      {!rendered ? <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-400">Trang {pageNumber}</div> : null}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

function ToolbarButton({ children, title, disabled, onClick }: { children: React.ReactNode; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
