"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();

export function PdfViewer({ fileUrl, height = 720, className }: { fileUrl?: string | null; height?: number | string; className?: string }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;
    setStatus("loading");
    setPdf(null);
    setPageNumber(1);
    setPageCount(0);

    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    loadingTask.promise
      .then((document) => {
        if (cancelled) {
          return;
        }
        setPdf(document);
        setPageCount(document.numPages);
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

  useEffect(() => {
    if (!pdf || !canvasRef.current || !wrapperRef.current) return;

    let cancelled = false;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(wrapper.clientWidth - 24, 280);
      const scale = availableWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, viewport.width, viewport.height);

      const renderTask = page.render({ canvasContext: context, canvas, viewport });
      await renderTask.promise;
    };

    void renderPage().catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!pdf) return;

    const rerenderCurrentPage = () => setPageNumber((current) => current);
    window.addEventListener("resize", rerenderCurrentPage);

    return () => window.removeEventListener("resize", rerenderCurrentPage);
  }, [pdf]);

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
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!pdf || pageNumber <= 1}
              onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>
            <span className="font-semibold text-slate-700">
              Trang {pageCount ? pageNumber : "-"} / {pageCount || "-"}
            </span>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!pdf || pageNumber >= pageCount}
              onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
            >
              Sau
            </button>
          </div>
          <a className="rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white" href={fileUrl} target="_blank" rel="noreferrer">
            Mở file gốc
          </a>
        </div>

        <div ref={wrapperRef} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 text-center">
          {status === "loading" ? <div className="py-10 text-sm font-semibold text-slate-500">Đang tải PDF...</div> : null}
          {status === "error" ? <div className="py-10 text-sm font-semibold text-red-600">Không tải được PDF. Hãy thử mở file gốc.</div> : null}
          <canvas ref={canvasRef} className={status === "ready" ? "mx-auto block rounded bg-white shadow-sm" : "hidden"} />
        </div>
      </div>
    </div>
  );
}
