import { useRef, useEffect, useState } from 'react';
import { SelectionOverlay } from './SelectionOverlay';
import type { ViewportMode } from '../types';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
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
  
  // New canvas attributes
  zoomScale: number;
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
  viewportMode,
  presentationMode
}: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Measure and align boundaries
  const updateElementRects = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;

    // 1. Calculate Selected Rect (relative to iframe viewport)
    if (selectedElementId) {
      const selectedEl = iframeDoc.querySelector(`[data-editor-id="${selectedElementId}"]`);
      if (selectedEl) {
        const clientRect = selectedEl.getBoundingClientRect();
        setSelectedRect({
          top: clientRect.top,
          left: clientRect.left,
          width: clientRect.width,
          height: clientRect.height
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

    // 2. Calculate Hovered Rect (relative to iframe viewport)
    if (hoveredElementId) {
      const hoveredEl = iframeDoc.querySelector(`[data-editor-id="${hoveredElementId}"]`);
      if (hoveredEl) {
        const clientRect = hoveredEl.getBoundingClientRect();
        setHoveredRect({
          top: clientRect.top,
          left: clientRect.left,
          width: clientRect.width,
          height: clientRect.height
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

    const iframeDoc = iframe.contentDocument;

    // 1. Intercept Click/Selection
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      
      // If parent is locked, click delegates up or does nothing. We find first non-locked ancestor
      let currentEl: HTMLElement | null = target;
      let editorId: string | null = null;
      
      while (currentEl && currentEl.tagName !== 'BODY') {
        if (currentEl.getAttribute('data-editor-locked') === 'true') {
          // If locked, we skip this node and click parent
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

    // 2. Intercept Mouse Hover
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
      updateElementRects();
    };

    // 3. Double Click for Inline Text Editing
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

    // Attach listeners
    iframeDoc.addEventListener('click', handleClick, true);
    iframeDoc.addEventListener('mouseover', handleMouseOver, true);
    iframeDoc.addEventListener('mouseout', handleMouseOut, true);
    iframeDoc.addEventListener('scroll', handleScroll, true);
    iframeDoc.addEventListener('dblclick', handleDoubleClick, true);

    const resizeObserver = new ResizeObserver(() => {
      updateElementRects();
    });
    if (iframeDoc.body) {
      resizeObserver.observe(iframeDoc.body);
    }

    return () => {
      iframeDoc.removeEventListener('click', handleClick, true);
      iframeDoc.removeEventListener('mouseover', handleMouseOver, true);
      iframeDoc.removeEventListener('mouseout', handleMouseOut, true);
      iframeDoc.removeEventListener('scroll', handleScroll, true);
      iframeDoc.removeEventListener('dblclick', handleDoubleClick, true);
      resizeObserver.disconnect();
    };
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const cleanup = handleIframeLoad();
      return cleanup;
    }
  }, [htmlContent]);

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

  // Determine viewport dimensions
  const getViewportDimensions = () => {
    switch (viewportMode) {
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'mobile':
        return { width: '375px', height: '812px' };
      default:
        return { width: '1024px', height: '576px' }; // 16:9 standard
    }
  };

  const { width, height } = getViewportDimensions();

  // If presentation mode is active, override styling to take full screen
  if (presentationMode) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center p-0 overflow-hidden relative z-50">
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

  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center p-12 overflow-auto select-none relative canvas-grid-background">
      {/* 
        The transformed wrapper. The scale matches zoomScale.
        Using transform-origin-center to center scaling, or transform-origin-top-left
        and wrapping in an inner container is ideal for positioning.
      */}
      <div
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div 
          ref={containerRef}
          className="relative bg-white shadow-2xl border border-slate-800 rounded-lg overflow-hidden"
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-6 text-center">
              <p className="text-sm font-semibold mb-1">Nenhum slide carregado</p>
              <p className="text-xs text-slate-600 max-w-sm">
                Importe um projeto para começar a desenhar.
              </p>
            </div>
          )}

          {/* 
            SelectionOverlay is nested inside the SCALED wrapper container.
            This ensures coordinates (left, top, width, height) are scaled automatically!
          */}
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
