"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback, type RefObject } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Download, Maximize } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
  url: string | null;
  onDownload?: () => void;
  documentName?: string;
  isCompiling?: boolean;
  compileError?: string;
}

interface PageDimensions {
  width: number;
  height: number;
}

interface PdfRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export function PDFViewer({ url, onDownload, documentName, isCompiling = false, compileError = "" }: PDFViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  // A value of one is deliberately the fit-to-width baseline. We label that
  // state as “Fit” in the UI, rather than misleadingly calling it 100%.
  const [scale, setScale] = useState(1.0);
  const [baseDimensions, setBaseDimensions] = useState<PageDimensions | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load PDF
  useEffect(() => {
    if (!url) {
      setPdf(null);
      setNumPages(0);
      setBaseDimensions(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    setLoading(true);
    setLoadError(null);
    setPdf(null);
    setNumPages(0);
    setBaseDimensions(null);

    const loadPDF = async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;
        
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);

        // Get dimensions of first page as baseline
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        setBaseDimensions({ width: viewport.width, height: viewport.height });

      } catch (error) {
        if (cancelled) return;
        console.error("Error loading PDF:", error);
        setLoadError(documentName ? `Quire could not read “${documentName}”.` : "No PDF is available yet. Compile this project to create a preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    void loadPDF();
    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [url]);

  // Fit must measure the panel itself, not the scroll area. At startup the
  // latter may still report its old content width, which made a full-width
  // document permanently render as a tiny page.
  useLayoutEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const measure = () => {
      const width = Math.round(el.getBoundingClientRect().width);
      if (width > 0) setContainerWidth((current) => current === width ? current : width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const firstFrame = requestAnimationFrame(measure);
    const secondFrame = requestAnimationFrame(() => requestAnimationFrame(measure));
    const settleTimer = window.setTimeout(measure, 180);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", measure);
    };
  }, [url]);

  // Navigation
  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el && containerRef.current) {
      // Manual scroll calculation to align neatly
      const container = containerRef.current;
      const topPos = el.offsetTop - 24; // account for padding
      container.scrollTo({ top: topPos, behavior: 'smooth' });
      setCurrentPage(pageNum);
    }
  }, []);

  const markPageVisible = useCallback((pageNum: number) => {
    setCurrentPage((current) => current === pageNum ? current : pageNum);
  }, []);

  // Compute actual display width/height per page based on fit-width
  // We leave 48px total horizontal padding (24px each side)
  const availableWidth = containerWidth > 0 ? Math.max(containerWidth - 48, 100) : baseDimensions?.width || 1;
  const fitScale = baseDimensions && containerWidth > 0 ? availableWidth / baseDimensions.width : 1;
  const currentScale = fitScale * scale;
  const isFitWidth = scale === 1;

  if (isCompiling) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[var(--quire-pdf-bg)] px-6 text-center" role="status" aria-live="polite">
        <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[var(--quire-red-soft)] text-[var(--quire-red)]">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-[var(--quire-red)]/15" />
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
        <p className="mt-4 text-sm font-semibold text-[var(--quire-text)]">Compiling locally…</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--quire-muted)]">Quire is building your PDF on this computer. The first build can take a moment while your LaTeX distribution prepares its packages.</p>
      </div>
    );
  }

  if (!url || loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--quire-muted)]">
        <span className="text-sm">No PDF yet</span>
        <span className={`mt-1 max-w-md text-center text-xs leading-5 ${compileError ? "text-[var(--quire-red)]" : ""}`}>{compileError || loadError || "Compile this project to generate a preview."}</span>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className="flex h-full w-full min-w-0 flex-col bg-[var(--quire-bg)]">
      {/* PDF Toolbar */}
      <div className="h-12 border-b border-[var(--quire-border)] bg-[var(--quire-surface)] flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-1.5 text-[12px] bg-[var(--quire-surface-secondary)] p-1 rounded-md border border-[var(--quire-border)] shadow-sm">
          <button 
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            className="px-2.5 py-1 rounded-sm text-[var(--quire-text-secondary)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] disabled:opacity-30 transition-all duration-150 ease-out font-medium"
          >
            Prev
          </button>
          <span className="tabular-nums min-w-[3rem] text-center font-medium text-[var(--quire-muted)]">
            <span className="text-[var(--quire-text)]">{currentPage}</span> / {numPages || "?"}
          </span>
          <button 
            disabled={currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            className="px-2.5 py-1 rounded-sm text-[var(--quire-text-secondary)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] disabled:opacity-30 transition-all duration-150 ease-out font-medium"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center gap-1 text-[var(--quire-muted)] bg-[var(--quire-surface-secondary)] p-1 rounded-md border border-[var(--quire-border)] shadow-sm">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Zoom out" aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[12px] w-12 text-center tabular-nums font-medium" title={isFitWidth ? "Fit to preview width" : "Document zoom"}>{isFitWidth ? "Fit" : `${Math.round(currentScale * 100)}%`}</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Zoom in" aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          <button onClick={() => setScale(1.0)} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Fit preview to width" aria-label="Fit preview to width">
            <Maximize className="w-4 h-4" />
            <span className="hidden lg:inline text-[11px] font-medium">Fit width</span>
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          {onDownload && <><div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
            <button onClick={onDownload} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Download PDF">
              <Download className="w-4 h-4" />
            </button>
          </>}
        </div>
      </div>
      
      {/* Scrollable Document Container */}
      <div 
        ref={containerRef}
        className="flex-1 w-full min-w-0 overflow-auto bg-[var(--quire-pdf-bg)] relative transition-colors duration-150 ease-out"
      >
        {loading ? (
          <div className="flex justify-center mt-12 text-sm text-[var(--quire-muted)]">Loading PDF...</div>
        ) : (
          <div className="flex flex-col items-center py-6 gap-6">
            {pdf && baseDimensions && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <PDFPageNode
                key={`${url}-${pageNum}`} // Re-mount if URL (build rev) changes
                pageNumber={pageNum}
                pdfDoc={pdf}
                scale={currentScale}
                baseDimensions={baseDimensions}
                scrollContainerRef={containerRef}
                onPageVisible={markPageVisible}
                onRef={(el) => {
                  if (el) {
                    pageRefs.current.set(pageNum, el);
                  } else {
                    pageRefs.current.delete(pageNum);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Single PDF Page Component with Lazy Loading & High-DPI Rendering
// ---------------------------------------------------------

interface PDFPageNodeProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  baseDimensions: PageDimensions;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPageVisible: (pageNumber: number) => void;
  onRef: (el: HTMLDivElement | null) => void;
}

function PDFPageNode({ pageNumber, pdfDoc, scale, baseDimensions, scrollContainerRef, onPageVisible, onRef }: PDFPageNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isVisible, setIsVisible] = useState(pageNumber === 1);
  const [dimensions, setDimensions] = useState<PageDimensions>(baseDimensions);
  const [renderedScale, setRenderedScale] = useState(0);
  const [renderedDoc, setRenderedDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);

  // Each page owns its observers so its initial render never depends on a
  // parent ref update or an unrelated UI interaction.
  useEffect(() => {
    const pageElement = containerRef.current;
    const scrollRoot = scrollContainerRef.current;
    if (!pageElement || !scrollRoot) {
      setIsVisible(true);
      return;
    }

    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      });
    }, { root: scrollRoot, rootMargin: "100% 0px 100% 0px" });

    const pageObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onPageVisible(pageNumber);
    }, { root: scrollRoot, rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    
    lazyObserver.observe(pageElement);
    pageObserver.observe(pageElement);
    
    return () => {
      lazyObserver.disconnect();
      pageObserver.disconnect();
    };
  }, [onPageVisible, pageNumber, scrollContainerRef]);

  // Render Page. PDF.js only allows one render task per canvas, so always
  // cancel and settle an earlier task before reusing this page's canvas.
  useEffect(() => {
    if (!isVisible || !canvasRef.current || (scale === renderedScale && pdfDoc === renderedDoc)) return;
    
    let cancelled = false;
    const canvas = canvasRef.current;
    
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        
        // Update precise dimensions just in case this page differs from baseDimensions
        const unscaledViewport = page.getViewport({ scale: 1 });
        setDimensions((current) =>
          current.width === unscaledViewport.width && current.height === unscaledViewport.height
            ? current
            : { width: unscaledViewport.width, height: unscaledViewport.height }
        );
        
        // CSS Display dimensions
        const cssWidth = unscaledViewport.width * scale;
        const cssHeight = unscaledViewport.height * scale;
        
        // Crisp High-DPI Rendering
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        
        // PDF.js rendering: either scale the viewport OR use a transform matrix.
        // We will scale the viewport natively to the full output resolution, and NOT use a transform matrix.
        const renderViewport = page.getViewport({ scale: scale * outputScale });
        
        const previousTask = renderTaskRef.current;
        if (previousTask) {
          previousTask.cancel();
          try {
            await previousTask.promise;
          } catch (error) {
            if (!(error instanceof Error) || error.name !== "RenderingCancelledException") {
              console.error(`Error cancelling page ${pageNumber} render:`, error);
            }
          }
        }
        if (cancelled) return;

        canvas.width = Math.floor(cssWidth * outputScale);
        canvas.height = Math.floor(cssHeight * outputScale);
        canvas.style.width = `${Math.floor(cssWidth)}px`;
        canvas.style.height = `${Math.floor(cssHeight)}px`;
        
        const context = canvas.getContext("2d");
        if (!context) return;
        
        const renderContext = {
          canvas,
          canvasContext: context,
          viewport: renderViewport,
          // Removed `transform` here because `renderViewport` is already scaled by `outputScale`
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null;
        }
        if (!cancelled) {
          setRenderedScale(scale);
          setRenderedDoc(pdfDoc);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "RenderingCancelledException") {
          // Ignore cancelled renders
        } else {
          console.error(`Error rendering page ${pageNumber}:`, error);
        }
      }
    };
    
    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [isVisible, scale, pdfDoc, pageNumber, renderedScale, renderedDoc]);

  // Compute placeholder styles
  const cssWidth = dimensions.width * scale;
  const cssHeight = dimensions.height * scale;

  return (
    <div 
      ref={(el) => {
        containerRef.current = el;
        onRef(el);
      }}
      data-page={pageNumber}
      className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:ring-white/10 rounded-sm overflow-hidden"
      style={{ 
        width: Math.floor(cssWidth), 
        height: Math.floor(cssHeight) 
      }}
    >
      {!isVisible || renderedScale !== scale ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
        </div>
      ) : null}
      
      <canvas 
        ref={canvasRef} 
        className="block"
        style={{
          opacity: renderedScale === scale ? 1 : 0.5,
          transition: "opacity 0.2s"
        }}
      />
    </div>
  );
}
