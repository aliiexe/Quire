"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, Download, Maximize } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PDFViewerProps {
  url: string | null;
  onDownload?: () => void;
}

interface PageDimensions {
  width: number;
  height: number;
}

interface PdfRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export function PDFViewer({ url, onDownload }: PDFViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0); // 1.0 means Fit Width baseline
  const [baseDimensions, setBaseDimensions] = useState<PageDimensions | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load PDF
  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    setLoading(true);

    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdfDoc = await loadingTask.promise;
        
        if (!isMounted) return;
        
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setCurrentPage(1);

        // Get dimensions of first page as baseline
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        setBaseDimensions({ width: viewport.width, height: viewport.height });

      } catch (error) {
        console.error("Error loading PDF:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadPDF();
    return () => { isMounted = false; };
  }, [url]);

  // ResizeObserver for Container Width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [url]); // Re-run this effect when URL changes (so the container is mounted)

  // IntersectionObserver for tracking current scroll page
  useEffect(() => {
    if (!pagesContainerRef.current) return;

    const options = {
      root: containerRef.current,
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      // Find the page most visible
      let mostVisibleId = -1;
      let maxRatio = -1;
      
      // Sometimes multiple pages intersect, we just grab the one currently intersecting in the middle
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || "1", 10);
          mostVisibleId = pageNum;
        }
      });

      if (mostVisibleId !== -1) {
        setCurrentPage(mostVisibleId);
      }
    }, options);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [containerWidth]);

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

  // Compute actual display width/height per page based on fit-width
  // We leave 48px total horizontal padding (24px each side)
  const availableWidth = Math.max(containerWidth - 48, 100);
  const fitScale = baseDimensions ? availableWidth / baseDimensions.width : 1;
  const currentScale = fitScale * scale;

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--quire-muted)]">
        <span className="text-sm">No PDF yet</span>
        <span className="text-xs mt-1">Compile this project to generate a preview.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--quire-bg)]">
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
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[12px] w-10 text-center tabular-nums font-medium">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          <button onClick={() => setScale(1.0)} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Fit Width">
            <Maximize className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          <button onClick={onDownload} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Download PDF">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Scrollable Document Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--quire-pdf-bg)] relative transition-colors duration-150 ease-out"
      >
        {loading ? (
          <div className="flex justify-center mt-12 text-sm text-[var(--quire-muted)]">Loading PDF...</div>
        ) : (
          <div 
            ref={pagesContainerRef}
            className="flex flex-col items-center py-6 gap-6"
          >
            {pdf && baseDimensions && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <PDFPageNode
                key={`${url}-${pageNum}`} // Re-mount if URL (build rev) changes
                pageNumber={pageNum}
                pdfDoc={pdf}
                scale={currentScale}
                baseDimensions={baseDimensions}
                observer={observerRef.current}
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
  observer: IntersectionObserver | null;
  onRef: (el: HTMLDivElement | null) => void;
}

function PDFPageNode({ pageNumber, pdfDoc, scale, baseDimensions, observer, onRef }: PDFPageNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isVisible, setIsVisible] = useState(false);
  const [dimensions, setDimensions] = useState<PageDimensions>(baseDimensions);
  const [renderedScale, setRenderedScale] = useState(0);
  const [renderedDoc, setRenderedDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<PdfRenderTask | null>(null);

  // Observe visibility
  useEffect(() => {
    if (!containerRef.current || !observer) return;
    
    // We create a local observer just to trigger lazy loading because 
    // the main observer is only for tracking the current page (threshold: 0, margin: "-40%")
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      });
    }, { rootMargin: "100% 0px 100% 0px" }); // Load when within 1 viewport distance
    
    lazyObserver.observe(containerRef.current);
    observer.observe(containerRef.current);
    
    return () => {
      lazyObserver.disconnect();
      if (containerRef.current && observer) observer.unobserve(containerRef.current);
    };
  }, [observer]);

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
