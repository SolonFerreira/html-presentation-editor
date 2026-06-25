import { useRef, useEffect, useState } from 'react';
import { SelectionOverlay } from './SelectionOverlay';

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
}

export function Canvas({
  htmlContent,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onUpdateText,
  onDeleteElement,
  onQuickFontChange
}: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Helper to calculate rect relative to the iframe wrapper container
  const updateElementRects = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;

    // 1. Calculate Selected Rect
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

    // 2. Calculate Hovered Rect
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

  // Re-measure on mount, selection change, or html change
  useEffect(() => {
    updateElementRects();
  }, [selectedElementId, hoveredElementId, htmlContent]);

  // Set up iframe event listeners once document loads
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const iframeDoc = iframe.contentDocument;

    // 1. Intercept Click/Selection
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id');
      
      if (editorId) {
        onSelectElement(editorId);
      } else {
        onSelectElement(null);
      }
    };

    // 2. Intercept Mouse Hover
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id');
      if (editorId) {
        onHoverElement(editorId);
      }
    };

    const handleMouseOut = () => {
      onHoverElement(null);
    };

    // 3. Intercept Scroll & Resize to update overlays
    const handleScroll = () => {
      updateElementRects();
    };

    // 4. Double Click for Inline Text Editing
    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id');
      if (!editorId || target.tagName === 'IMG') return;

      // Enable contenteditable
      target.setAttribute('contenteditable', 'true');
      target.focus();

      // Listen to text change
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

    // Watch for size changes inside the iframe (element shifts, page expands)
    const resizeObserver = new ResizeObserver(() => {
      updateElementRects();
    });
    if (iframeDoc.body) {
      resizeObserver.observe(iframeDoc.body);
    }

    // Clean up
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
    // Whenever content changes, we must wait for iframe load/render
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

  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-auto select-none relative">
      <div 
        ref={containerRef}
        className="relative bg-white shadow-2xl border border-slate-800 rounded-lg overflow-hidden transition-all duration-150"
        style={{
          width: '1024px',  // Locked 16:9 widescreen presentation canvas preview
          height: '576px',
        }}
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
              Use o botão "Importar Projeto" na barra superior para carregar sua apresentação HTML.
            </p>
          </div>
        )}

        {/* Floating selection handle borders overlay */}
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
  );
}
