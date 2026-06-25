import { useRef, useEffect, useState } from 'react';
import { Layout } from 'lucide-react';
import { SelectionOverlay } from './SelectionOverlay';
import type { ViewportMode } from '../types';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

interface CanvasProps {
  htmlContent: string;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onHoverElement: (id: string | null) => void;
  onUpdateText: (elementId: string, text: string) => void;
  onDeleteElement: (elementId: string) => void;
  onQuickFontChange: (elementId: string, dir: 'up' | 'down') => void;
  
  // Canvas attributes
  zoomScale: number;
  onZoomChange?: (scale: number) => void;
  viewportMode: ViewportMode;
  presentationMode: boolean;
}

export function Canvas({
  htmlContent,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onUpdateText,
  onDeleteElement,
  onQuickFontChange,
  
  zoomScale,
  onZoomChange,
  viewportMode,
  presentationMode
}: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeScrollRef = useRef({ top: 0, left: 0 });
  
  // Refs for tracking iframe loading state, timers, and event cleanup
  const isReloadingRef = useRef(false);
  const prevHtmlContentRef = useRef(htmlContent);
  const iframeTimersRef = useRef<number[]>([]);
  const iframeCleanupRef = useRef<(() => void) | null>(null);

  // If htmlContent changes, mark as reloading to block scroll updates from unload/reload events
  if (prevHtmlContentRef.current !== htmlContent) {
    isReloadingRef.current = true;
    prevHtmlContentRef.current = htmlContent;
  }
  
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Panning State
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Listen to Spacebar press for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !spacePressed) {
        // Only trigger if not typing in inputs
        const activeEl = document.activeElement;
        const isEditable = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.hasAttribute('contenteditable')
        );
        if (!isEditable) {
          e.preventDefault();
          setSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setSpacePressed(false);
        setIsDragging(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  // Handle Drag-to-Pan Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!spacePressed || !containerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom on wheel (Ctrl + Wheel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (!onZoomChange) return;
        
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const newZoom = Math.min(3.0, Math.max(0.2, zoomScale + delta));
        onZoomChange(parseFloat(newZoom.toFixed(2)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomScale, onZoomChange]);

  // Measure and align boundaries
  const updateElementRects = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;
    const bodyRect = iframeDoc.body ? iframeDoc.body.getBoundingClientRect() : { left: 0, top: 0 };

    // 1. Selected Rect
    if (selectedElementId) {
      const selectedEl = iframeDoc.querySelector(`[data-editor-id="${selectedElementId}"]`);
      if (selectedEl) {
        const clientRect = selectedEl.getBoundingClientRect();
        setSelectedRect({
          top: clientRect.top,
          left: clientRect.left,
          width: clientRect.width,
          height: clientRect.height,
          x: Math.round(clientRect.left - bodyRect.left),
          y: Math.round(clientRect.top - bodyRect.top)
        });
        setSelectedTag(selectedEl.tagName);
      } else {
        setSelectedRect(null);
        setSelectedTag(null);
      }
    } else {
      setSelectedRect(null);
      setSelectedTag(null);
    }

    // 2. Hovered Rect
    if (hoveredElementId) {
      const hoveredEl = iframeDoc.querySelector(`[data-editor-id="${hoveredElementId}"]`);
      if (hoveredEl) {
        const clientRect = hoveredEl.getBoundingClientRect();
        setHoveredRect({
          top: clientRect.top,
          left: clientRect.left,
          width: clientRect.width,
          height: clientRect.height,
          x: Math.round(clientRect.left - bodyRect.left),
          y: Math.round(clientRect.top - bodyRect.top)
        });
        setHoveredTag(hoveredEl.tagName);
      } else {
        setHoveredRect(null);
        setHoveredTag(null);
      }
    } else {
      setHoveredRect(null);
      setHoveredTag(null);
    }
  };

  // Re-measure on state changes
  useEffect(() => {
    updateElementRects();
  }, [selectedElementId, hoveredElementId, htmlContent, zoomScale, viewportMode]);

  // Set up iframe event listeners
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    // Clear any previous scheduled scroll/reload timers
    iframeTimersRef.current.forEach(timer => window.clearTimeout(timer));
    iframeTimersRef.current = [];

    // Clean up previous event listeners
    if (iframeCleanupRef.current) {
      try {
        iframeCleanupRef.current();
      } catch (err) {
        console.warn('Error cleaning up previous iframe events:', err);
      }
      iframeCleanupRef.current = null;
    }

    const iframeDoc = iframe.contentDocument;

    // Helper to apply scroll position safely
    const restoreScroll = () => {
      const targetTop = iframeScrollRef.current.top;
      const targetLeft = iframeScrollRef.current.left;
      
      if (iframeDoc.documentElement) {
        iframeDoc.documentElement.scrollTop = targetTop;
        iframeDoc.documentElement.scrollLeft = targetLeft;
      }
      if (iframeDoc.body) {
        iframeDoc.body.scrollTop = targetTop;
        iframeDoc.body.scrollLeft = targetLeft;
      }
    };

    // Restore scroll position immediately
    restoreScroll();

    // Schedule progressive restores to ensure layout adjustments are accounted for
    [10, 50, 100, 200, 350, 500].forEach((delay) => {
      const timer = window.setTimeout(restoreScroll, delay);
      iframeTimersRef.current.push(timer);
    });

    // Reset the reloading flag once the document load/layout settles
    const reloadTimeout = window.setTimeout(() => {
      isReloadingRef.current = false;
    }, 600);
    iframeTimersRef.current.push(reloadTimeout);

    // Intercept Click/Selection
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      let currentEl: HTMLElement | null = target;
      let editorId: string | null = null;
      
      while (currentEl && currentEl.tagName !== 'BODY') {
        if (currentEl.getAttribute('data-editor-locked') === 'true') {
          currentEl = currentEl.parentElement;
          continue;
        }
        editorId = currentEl.getAttribute('data-editor-id');
        if (editorId) break;
        currentEl = currentEl.parentElement;
      }
      
      if (editorId) {
        onSelectElement(editorId);
      } else {
        onSelectElement(null);
      }
    };

    // Intercept Mouse Hover
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      let currentEl: HTMLElement | null = target;
      let editorId: string | null = null;
      
      while (currentEl && currentEl.tagName !== 'BODY') {
        if (currentEl.getAttribute('data-editor-locked') === 'true') {
          currentEl = currentEl.parentElement;
          continue;
        }
        editorId = currentEl.getAttribute('data-editor-id');
        if (editorId) break;
        currentEl = currentEl.parentElement;
      }

      if (editorId) {
        onHoverElement(editorId);
      }
    };

    const handleMouseOut = () => {
      onHoverElement(null);
    };

    const handleScroll = () => {
      // Do not overwrite scroll reference if the scroll event triggers during a reload or layout shift
      if (isReloadingRef.current) return;
      
      if (iframeDoc.documentElement) {
        iframeScrollRef.current = {
          top: iframeDoc.documentElement.scrollTop || iframeDoc.body?.scrollTop || 0,
          left: iframeDoc.documentElement.scrollLeft || iframeDoc.body?.scrollLeft || 0
        };
      }
      updateElementRects();
    };

    // Double Click for Inline Text Editing
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id');
      if (!editorId || target.tagName === 'IMG' || target.getAttribute('data-editor-locked') === 'true') return;

      target.setAttribute('contenteditable', 'true');
      target.focus();

      const saveText = () => {
        target.removeAttribute('contenteditable');
        onUpdateText(editorId, target.innerText);
        updateElementRects();
      };

      target.onblur = saveText;
      target.onkeydown = (keyEvent) => {
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          target.blur();
        }
      };
    };

    // Forward Keydowns inside IFrame to parent window!
    const handleIFrameKeyDown = (e: KeyboardEvent) => {
      const parentEvent = new KeyboardEvent('keydown', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(parentEvent);
    };

    // Attach listeners
    iframeDoc.addEventListener('click', handleClick, true);
    iframeDoc.addEventListener('mouseover', handleMouseOver, true);
    iframeDoc.addEventListener('mouseout', handleMouseOut, true);
    iframeDoc.addEventListener('scroll', handleScroll, true);
    iframeDoc.addEventListener('dblclick', handleDoubleClick, true);
    iframeDoc.addEventListener('keydown', handleIFrameKeyDown, true);

    const resizeObserver = new ResizeObserver(() => {
      updateElementRects();
    });
    if (iframeDoc.body) {
      resizeObserver.observe(iframeDoc.body);
    }

    // Save cleanup callback
    iframeCleanupRef.current = () => {
      iframeDoc.removeEventListener('click', handleClick, true);
      iframeDoc.removeEventListener('mouseover', handleMouseOver, true);
      iframeDoc.removeEventListener('mouseout', handleMouseOut, true);
      iframeDoc.removeEventListener('scroll', handleScroll, true);
      iframeDoc.removeEventListener('dblclick', handleDoubleClick, true);
      iframeDoc.removeEventListener('keydown', handleIFrameKeyDown, true);
      resizeObserver.disconnect();
    };
  };

  // Clean up all iframe listeners and timers on component unmount
  useEffect(() => {
    return () => {
      if (iframeCleanupRef.current) {
        try {
          iframeCleanupRef.current();
        } catch (e) {
          // Ignore unmount errors
        }
      }
      iframeTimersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  const handleQuickAction = (action: string) => {
    if (!selectedElementId) return;
    if (action === 'delete') {
      onDeleteElement(selectedElementId);
    } else if (action === 'font-up') {
      onQuickFontChange(selectedElementId, 'up');
    } else if (action === 'font-down') {
      onQuickFontChange(selectedElementId, 'down');
    }
  };

  const getViewportDimensions = () => {
    switch (viewportMode) {
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'mobile':
        return { width: '375px', height: '812px' };
      default:
        return { width: '1024px', height: '576px' };
    }
  };

  const { width, height } = getViewportDimensions();

  if (presentationMode) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center p-0 overflow-hidden relative z-50 animate-fade-in">
        <div 
          className="relative bg-black overflow-hidden"
          style={{ width: '1024px', height: '576px' }}
        >
          {htmlContent && (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full h-full border-none pointer-events-auto"
              title="Presentation screen"
            />
          )}
        </div>
      </div>
    );
  }

  const cursorClass = spacePressed ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default';

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`flex-1 bg-slate-950 flex items-center justify-center p-20 overflow-auto select-none relative canvas-grid-background no-scrollbar ${cursorClass}`}
    >
      <div
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="shrink-0"
      >
        <div 
          className="relative bg-white shadow-premium border border-slate-900 rounded-lg overflow-hidden animate-scale-in"
          style={{ width, height }}
        >
          {htmlContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full h-full border-none pointer-events-auto"
              title="HTML presentation preview"
              onLoad={handleIframeLoad}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
              
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-center mb-4 shadow-lg text-blue-400">
                <Layout className="w-6 h-6 animate-pulse" />
              </div>
              
              <h3 className="text-white font-bold text-sm mb-1 tracking-tight">Comece a projetar sua apresentação</h3>
              <p className="text-[10px] text-slate-500 max-w-xs mb-6 leading-relaxed">
                Abra uma pasta de projeto contendo arquivos HTML locais para começar a criar e editar slides visualmente de forma instantânea.
              </p>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-900 pt-4 w-full max-w-xs text-[10px] text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>Abrir Console</span>
                  <kbd className="bg-slate-900 border border-slate-800 px-1.5 rounded font-mono text-[9px] text-slate-400 font-bold">⌘K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Duplicar Camada</span>
                  <kbd className="bg-slate-900 border border-slate-800 px-1.5 rounded font-mono text-[9px] text-slate-400 font-bold">⌘D</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Pan no Canvas</span>
                  <kbd className="bg-slate-900 border border-slate-800 px-1.5 rounded font-mono text-[9px] text-slate-400 font-bold">Espaço</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Medir Distâncias</span>
                  <kbd className="bg-slate-900 border border-slate-800 px-1.5 rounded font-mono text-[9px] text-slate-400 font-bold">Alt / Option</kbd>
                </div>
              </div>
            </div>
          )}

          {htmlContent && (
            <SelectionOverlay
              selectedRect={selectedRect}
              hoveredRect={hoveredRect}
              selectedTag={selectedTag}
              hoveredTag={hoveredTag}
              quickAction={handleQuickAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}
