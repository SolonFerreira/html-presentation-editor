import { useRef, useEffect, useState, useMemo } from 'react';
import { Layout } from 'lucide-react';
import { SelectionOverlay } from './SelectionOverlay';
import { ContextualHUD } from './ContextualHUD';
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
  selectedElementIds: string[];
  hoveredElementId: string | null;
  onSelectElement: (id: string | null, isMulti?: boolean) => void;
  onHoverElement: (id: string | null) => void;
  onUpdateText: (elementId: string, text: string) => void;
  onDeleteElement: (elementId: string) => void;
  onQuickFontChange: (elementId: string, dir: 'up' | 'down') => void;
  onUpdateStyles?: (elementId: string, styles: Record<string, string>) => void;
  
  // Structural actions
  onUnwrapElement?: (id: string) => void;
  onWrapElement?: (id: string, tag: 'div' | 'section') => void;
  onChangeElementTag?: (id: string, newTag: string) => void;
  onClearElementStyles?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  onReorderElement?: (id: string, direction: 'up' | 'down') => void;
  onMoveElementOut?: (id: string) => void;
  onGroupElement?: (id: string) => void;
  onInsertComponent?: (elementId: string | null, componentType: string) => void;
  onMoveElementToLocation?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;

  // Canvas attributes
  zoomScale: number;
  onZoomChange?: (scale: number) => void;
  viewportMode: ViewportMode;
  presentationMode: boolean;
}

export function Canvas({
  htmlContent,
  selectedElementId,
  selectedElementIds = [],
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onUpdateText,
  onDeleteElement,
  onQuickFontChange,
  onUpdateStyles,
  onUnwrapElement,
  onWrapElement,
  onChangeElementTag,
  onClearElementStyles,
  onDuplicateElement,
  onReorderElement,
  onMoveElementOut,
  onGroupElement,
  onInsertComponent,
  onMoveElementToLocation,
  
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
  const [selectedRects, setSelectedRects] = useState<Rect[]>([]);
  const [hoveredRect, setHoveredRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [selectedPadding, setSelectedPadding] = useState<{ top: number; right: number; bottom: number; left: number } | undefined>(undefined);
  const [selectedDisplay, setSelectedDisplay] = useState<string | undefined>(undefined);
  const [selectedFlexDirection, setSelectedFlexDirection] = useState<string | undefined>(undefined);

  // Drag and drop visual layout states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  useEffect(() => {
    draggedIdRef.current = draggedId;
  }, [draggedId]);

  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside'>('after');
  const [dropTargetRect, setDropTargetRect] = useState<Rect | null>(null);

  // Panning State
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Resizing State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startPaddingTop: number;
    startPaddingBottom: number;
    startPaddingLeft: number;
    startPaddingRight: number;
    isContainer: boolean;
  } | null>(null);

  // Viewport resize state
  const [customViewportWidth, setCustomViewportWidth] = useState<number | null>(null);
  const [isResizingViewport, setIsResizingViewport] = useState(false);
  const viewportResizeStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 });

  // Reset custom width when viewport mode changes
  useEffect(() => {
    setCustomViewportWidth(null);
  }, [viewportMode]);

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

  // Resize Handlers
  const handleResizeStart = (handle: string, startEvent: React.MouseEvent) => {
    if (!selectedElementId || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const el = iframeDoc.querySelector(`[data-editor-id="${selectedElementId}"]`) as HTMLElement;
    if (!el) return;

    const clientRect = el.getBoundingClientRect();
    const computedStyle = el.ownerDocument.defaultView?.getComputedStyle(el) || window.getComputedStyle(el);
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

    const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN'].includes(el.tagName);

    setIsResizing(true);
    setResizeStart({
      handle,
      startX: startEvent.clientX,
      startY: startEvent.clientY,
      startWidth: clientRect.width,
      startHeight: clientRect.height,
      startPaddingTop: paddingTop,
      startPaddingBottom: paddingBottom,
      startPaddingLeft: paddingLeft,
      startPaddingRight: paddingRight,
      isContainer
    });
  };

  useEffect(() => {
    const handleGlobalDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id') || target.closest('[data-editor-id]')?.getAttribute('data-editor-id');
      if (editorId) {
        setDraggedId(editorId);
      }
    };

    const handleGlobalDragEnd = () => {
      setDraggedId(null);
      setDropTargetId(null);
      setDropTargetRect(null);
    };

    window.addEventListener('dragstart', handleGlobalDragStart);
    window.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      window.removeEventListener('dragstart', handleGlobalDragStart);
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const dropTargetIdRef = useRef<string | null>(null);
  const dropPositionRef = useRef<'before' | 'after' | 'inside'>('after');

  const handleDragMouseMove = (clientX: number, clientY: number, isInsideIframe: boolean) => {
    if (!draggedIdRef.current) return;
    
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const iframeDoc = iframe.contentDocument;
    
    let x = clientX;
    let y = clientY;
    
    if (!isInsideIframe) {
      const iframeRect = iframe.getBoundingClientRect();
      x = clientX - iframeRect.left;
      y = clientY - iframeRect.top;
    }
    
    const target = iframeDoc.elementFromPoint(x, y) as HTMLElement;
    if (!target) {
      setDropTargetId(null);
      setDropTargetRect(null);
      dropTargetIdRef.current = null;
      return;
    }
    
    let currentEl: HTMLElement | null = target;
    let targetId: string | null = null;
    
    while (currentEl && currentEl.tagName !== 'BODY') {
      if (currentEl.getAttribute('data-editor-locked') === 'true') {
        currentEl = currentEl.parentElement;
        continue;
      }
      targetId = currentEl.getAttribute('data-editor-id');
      if (targetId) break;
      currentEl = currentEl.parentElement;
    }
    
    const activeDraggedId = draggedIdRef.current;
    if (targetId && activeDraggedId && targetId !== activeDraggedId) {
      const targetEl = iframeDoc.querySelector(`[data-editor-id="${targetId}"]`) as HTMLElement;
      const draggedEl = iframeDoc.querySelector(`[data-editor-id="${activeDraggedId}"]`);
      
      if (targetEl && draggedEl && !draggedEl.contains(targetEl)) {
        const rect = targetEl.getBoundingClientRect();
        const bodyRect = iframeDoc.body ? iframeDoc.body.getBoundingClientRect() : { left: 0, top: 0 };
        
        const relativeY = y - rect.top;
        const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN'].includes(targetEl.tagName);
        
        let position: 'before' | 'after' | 'inside' = 'after';
        
        if (isContainer) {
          const edgeZoneHeight = Math.min(rect.height * 0.2, 16);
          if (relativeY < edgeZoneHeight) {
            position = 'before';
          } else if (relativeY > rect.height - edgeZoneHeight) {
            position = 'after';
          } else {
            position = 'inside';
          }
        } else {
          if (relativeY < rect.height / 2) {
            position = 'before';
          } else {
            position = 'after';
          }
        }
        
        setDropTargetId(prevId => {
          if (prevId !== targetId) return targetId;
          return prevId;
        });
        setDropPosition(prevPos => {
          if (prevPos !== position) return position;
          return prevPos;
        });
        setDropTargetRect(prevRect => {
          if (
            !prevRect ||
            prevRect.top !== rect.top ||
            prevRect.left !== rect.left ||
            prevRect.width !== rect.width ||
            prevRect.height !== rect.height
          ) {
            return {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              x: Math.round(rect.left - bodyRect.left),
              y: Math.round(rect.top - bodyRect.top)
            };
          }
          return prevRect;
        });
        
        dropTargetIdRef.current = targetId;
        dropPositionRef.current = position;
      } else {
        setDropTargetId(null);
        setDropTargetRect(null);
        dropTargetIdRef.current = null;
      }
    } else {
      setDropTargetId(null);
      setDropTargetRect(null);
      dropTargetIdRef.current = null;
    }
  };

  useEffect(() => {
    const activeDraggedId = draggedId;
    if (!activeDraggedId) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe?.contentDocument;

    const handleMouseMoveParent = (e: MouseEvent) => {
      handleDragMouseMove(e.clientX, e.clientY, false);
    };

    const handleMouseMoveIframe = (e: MouseEvent) => {
      handleDragMouseMove(e.clientX, e.clientY, true);
    };

    const handleMouseUpGlobal = () => {
      const targetId = dropTargetIdRef.current;
      const position = dropPositionRef.current;
      
      if (activeDraggedId && targetId && onMoveElementToLocation) {
        onMoveElementToLocation(activeDraggedId, targetId, position);
      }

      setDraggedId(null);
      setDropTargetId(null);
      setDropTargetRect(null);
      dropTargetIdRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMoveParent);
    window.addEventListener('mouseup', handleMouseUpGlobal);

    if (iframeDoc) {
      iframeDoc.addEventListener('mousemove', handleMouseMoveIframe);
      iframeDoc.addEventListener('mouseup', handleMouseUpGlobal);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveParent);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
      if (iframeDoc) {
        iframeDoc.removeEventListener('mousemove', handleMouseMoveIframe);
        iframeDoc.removeEventListener('mouseup', handleMouseUpGlobal);
      }
    };
  }, [draggedId]);

  const handleViewportResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentW = customViewportWidth !== null 
      ? customViewportWidth 
      : parseInt(getViewportDimensions().width, 10);

    viewportResizeStartRef.current = {
      startX: e.clientX,
      startWidth: currentW
    };
    setIsResizingViewport(true);
  };

  useEffect(() => {
    if (!isResizingViewport) return;

    const handleMouseMoveWindow = (e: MouseEvent) => {
      const dx = e.clientX - viewportResizeStartRef.current.startX;
      const deltaX = dx / zoomScale;
      const newWidth = Math.max(320, Math.min(2000, viewportResizeStartRef.current.startWidth + deltaX * 2));
      setCustomViewportWidth(Math.round(newWidth));
    };

    const handleMouseUpWindow = () => {
      setIsResizingViewport(false);
    };

    window.addEventListener('mousemove', handleMouseMoveWindow);
    window.addEventListener('mouseup', handleMouseUpWindow);
    
    const iframe = iframeRef.current;
    const iframeDoc = iframe?.contentDocument;
    if (iframeDoc) {
      iframeDoc.addEventListener('mousemove', handleMouseMoveWindow);
      iframeDoc.addEventListener('mouseup', handleMouseUpWindow);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handleMouseUpWindow);
      if (iframeDoc) {
        iframeDoc.removeEventListener('mousemove', handleMouseMoveWindow);
        iframeDoc.removeEventListener('mouseup', handleMouseUpWindow);
      }
    };
  }, [isResizingViewport, zoomScale]);

  useEffect(() => {
    if (!isResizing || !resizeStart || !selectedElementId || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const el = iframeDoc.querySelector(`[data-editor-id="${selectedElementId}"]`) as HTMLElement;
    if (!el) return;

    const handleMouseMoveWindow = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.startX;
      const dy = e.clientY - resizeStart.startY;
      const deltaX = dx / zoomScale;
      const deltaY = dy / zoomScale;

      const handle = resizeStart.handle;

      if (resizeStart.isContainer) {
        let newPaddingTop = resizeStart.startPaddingTop;
        let newPaddingBottom = resizeStart.startPaddingBottom;
        let newPaddingLeft = resizeStart.startPaddingLeft;
        let newPaddingRight = resizeStart.startPaddingRight;

        if (handle.includes('right')) {
          newPaddingRight = resizeStart.startPaddingRight + deltaX;
        } else if (handle.includes('left')) {
          newPaddingLeft = resizeStart.startPaddingLeft - deltaX;
        }

        if (handle.includes('bottom')) {
          newPaddingBottom = resizeStart.startPaddingBottom + deltaY;
        } else if (handle.includes('top')) {
          newPaddingTop = resizeStart.startPaddingTop - deltaY;
        }

        newPaddingTop = Math.max(0, newPaddingTop);
        newPaddingBottom = Math.max(0, newPaddingBottom);
        newPaddingLeft = Math.max(0, newPaddingLeft);
        newPaddingRight = Math.max(0, newPaddingRight);

        el.style.paddingTop = `${Math.round(newPaddingTop)}px`;
        el.style.paddingBottom = `${Math.round(newPaddingBottom)}px`;
        el.style.paddingLeft = `${Math.round(newPaddingLeft)}px`;
        el.style.paddingRight = `${Math.round(newPaddingRight)}px`;
      } else {
        let newWidth = resizeStart.startWidth;
        let newHeight = resizeStart.startHeight;

        if (handle.includes('right')) {
          newWidth = resizeStart.startWidth + deltaX;
        } else if (handle.includes('left')) {
          newWidth = resizeStart.startWidth - deltaX;
        }

        if (handle.includes('bottom')) {
          newHeight = resizeStart.startHeight + deltaY;
        } else if (handle.includes('top')) {
          newHeight = resizeStart.startHeight - deltaY;
        }

        newWidth = Math.max(10, newWidth);
        newHeight = Math.max(10, newHeight);

        el.style.width = `${Math.round(newWidth)}px`;
        el.style.height = `${Math.round(newHeight)}px`;
      }

      updateElementRects();
    };

    const handleMouseUpWindow = () => {
      setIsResizing(false);
      setResizeStart(null);

      if (onUpdateStyles) {
        if (resizeStart.isContainer) {
          onUpdateStyles(selectedElementId, {
            paddingTop: el.style.paddingTop,
            paddingBottom: el.style.paddingBottom,
            paddingLeft: el.style.paddingLeft,
            paddingRight: el.style.paddingRight
          });
        } else {
          onUpdateStyles(selectedElementId, {
            width: el.style.width,
            height: el.style.height
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMoveWindow);
    window.addEventListener('mouseup', handleMouseUpWindow);
    iframeDoc.addEventListener('mousemove', handleMouseMoveWindow);
    iframeDoc.addEventListener('mouseup', handleMouseUpWindow);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handleMouseUpWindow);
      iframeDoc.removeEventListener('mousemove', handleMouseMoveWindow);
      iframeDoc.removeEventListener('mouseup', handleMouseUpWindow);
    };
  }, [isResizing, resizeStart, selectedElementId, zoomScale, onUpdateStyles]);

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

    // 1. Selected Rects
    const activeIds = selectedElementIds.length > 0
      ? selectedElementIds
      : (selectedElementId ? [selectedElementId] : []);

    const rects: Rect[] = [];
    const tags: string[] = [];

    activeIds.forEach(id => {
      const el = iframeDoc.querySelector(`[data-editor-id="${id}"]`);
      if (el) {
        const clientRect = el.getBoundingClientRect();
        rects.push({
          top: clientRect.top,
          left: clientRect.left,
          width: clientRect.width,
          height: clientRect.height,
          x: Math.round(clientRect.left - bodyRect.left),
          y: Math.round(clientRect.top - bodyRect.top)
        });
        tags.push(el.tagName);
      }
    });

    setSelectedRects(rects);
    setSelectedTags(tags);

    if (rects.length > 0) {
      setSelectedRect(rects[0]);
      setSelectedTag(tags[0]);

      const primaryId = activeIds[0];
      const primaryEl = iframeDoc.querySelector(`[data-editor-id="${primaryId}"]`);
      if (primaryEl) {
        const computedStyle = primaryEl.ownerDocument?.defaultView?.getComputedStyle(primaryEl) || window.getComputedStyle(primaryEl);
        if (computedStyle) {
          setSelectedPadding({
            top: parseFloat(computedStyle.paddingTop) || 0,
            right: parseFloat(computedStyle.paddingRight) || 0,
            bottom: parseFloat(computedStyle.paddingBottom) || 0,
            left: parseFloat(computedStyle.paddingLeft) || 0
          });
          setSelectedDisplay(computedStyle.display || undefined);
          setSelectedFlexDirection(computedStyle.flexDirection || undefined);
        }
      }
    } else {
      setSelectedRect(null);
      setSelectedTag(null);
      setSelectedPadding(undefined);
      setSelectedDisplay(undefined);
      setSelectedFlexDirection(undefined);
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
  }, [selectedElementId, selectedElementIds, hoveredElementId, htmlContent, zoomScale, viewportMode]);

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
        onSelectElement(editorId, e.shiftKey || e.metaKey || e.ctrlKey);
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

    const handleIframeDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const editorId = target.getAttribute('data-editor-id') || target.closest('[data-editor-id]')?.getAttribute('data-editor-id');
      if (editorId) {
        setDraggedId(editorId);
      }
    };

    const handleIframeDragEnd = () => {
      setDraggedId(null);
      setDropTargetId(null);
      setDropTargetRect(null);
    };

    const handleIframeDragOver = (e: DragEvent) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      let currentEl: HTMLElement | null = target;
      let targetId: string | null = null;
      
      while (currentEl && currentEl.tagName !== 'BODY') {
        if (currentEl.getAttribute('data-editor-locked') === 'true') {
          currentEl = currentEl.parentElement;
          continue;
        }
        targetId = currentEl.getAttribute('data-editor-id');
        if (targetId) break;
        currentEl = currentEl.parentElement;
      }

      const activeDraggedId = draggedIdRef.current;

      if (targetId && activeDraggedId && targetId !== activeDraggedId) {
        const targetEl = iframeDoc.querySelector(`[data-editor-id="${targetId}"]`) as HTMLElement;
        const draggedEl = iframeDoc.querySelector(`[data-editor-id="${activeDraggedId}"]`);
        
        if (targetEl && draggedEl && !draggedEl.contains(targetEl)) {
          const rect = targetEl.getBoundingClientRect();
          const bodyRect = iframeDoc.body ? iframeDoc.body.getBoundingClientRect() : { left: 0, top: 0 };
          
          const relativeY = e.clientY - rect.top;
          const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN'].includes(targetEl.tagName);
          
          let position: 'before' | 'after' | 'inside' = 'after';
          
          if (isContainer) {
            const edgeZoneHeight = Math.min(rect.height * 0.2, 16);
            if (relativeY < edgeZoneHeight) {
              position = 'before';
            } else if (relativeY > rect.height - edgeZoneHeight) {
              position = 'after';
            } else {
              position = 'inside';
            }
          } else {
            if (relativeY < rect.height / 2) {
              position = 'before';
            } else {
              position = 'after';
            }
          }

          setDropTargetId(prevId => {
            if (prevId !== targetId) return targetId;
            return prevId;
          });
          setDropPosition(prevPos => {
            if (prevPos !== position) return position;
            return prevPos;
          });
          setDropTargetRect(prevRect => {
            if (
              !prevRect ||
              prevRect.top !== rect.top ||
              prevRect.left !== rect.left ||
              prevRect.width !== rect.width ||
              prevRect.height !== rect.height
            ) {
              return {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                x: Math.round(rect.left - bodyRect.left),
                y: Math.round(rect.top - bodyRect.top)
              };
            }
            return prevRect;
          });
        } else {
          setDropTargetId(null);
          setDropTargetRect(null);
        }
      } else {
        setDropTargetId(null);
        setDropTargetRect(null);
      }
    };

    const handleIframeDragLeave = () => {
      setDropTargetId(null);
      setDropTargetRect(null);
    };

    const handleIframeDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const activeDraggedId = draggedIdRef.current;

      if (activeDraggedId && dropTargetId && onMoveElementToLocation) {
        onMoveElementToLocation(activeDraggedId, dropTargetId, dropPosition);
      }

      setDraggedId(null);
      setDropTargetId(null);
      setDropTargetRect(null);
    };

    // Attach listeners
    iframeDoc.addEventListener('click', handleClick, true);
    iframeDoc.addEventListener('mouseover', handleMouseOver, true);
    iframeDoc.addEventListener('mouseout', handleMouseOut, true);
    iframeDoc.addEventListener('scroll', handleScroll, true);
    iframeDoc.addEventListener('dblclick', handleDoubleClick, true);
    iframeDoc.addEventListener('keydown', handleIFrameKeyDown, true);
    iframeDoc.addEventListener('dragstart', handleIframeDragStart, true);
    iframeDoc.addEventListener('dragend', handleIframeDragEnd, true);
    iframeDoc.addEventListener('dragover', handleIframeDragOver, true);
    iframeDoc.addEventListener('dragleave', handleIframeDragLeave, true);
    iframeDoc.addEventListener('drop', handleIframeDrop, true);

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
      iframeDoc.removeEventListener('dragstart', handleIframeDragStart, true);
      iframeDoc.removeEventListener('dragend', handleIframeDragEnd, true);
      iframeDoc.removeEventListener('dragover', handleIframeDragOver, true);
      iframeDoc.removeEventListener('dragleave', handleIframeDragLeave, true);
      iframeDoc.removeEventListener('drop', handleIframeDrop, true);
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

  const { width: defaultWidth, height } = getViewportDimensions();
  const width = customViewportWidth !== null ? `${customViewportWidth}px` : defaultWidth;

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

  const selectedElementData = useMemo(() => {
    if (!selectedElementId || !iframeRef.current) return null;
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return null;

    const el = iframeDoc.querySelector(`[data-editor-id="${selectedElementId}"]`) as HTMLElement;
    if (!el) return null;

    const styleRecord: Record<string, string> = {};
    for (let i = 0; i < el.style.length; i++) {
      const key = el.style[i];
      styleRecord[key] = el.style.getPropertyValue(key);
    }
    
    const computedStyle = el.ownerDocument?.defaultView?.getComputedStyle(el);
    if (computedStyle) {
      if (!styleRecord.color && computedStyle.color) styleRecord.color = computedStyle.color;
      if (!styleRecord.backgroundColor && computedStyle.backgroundColor) styleRecord.backgroundColor = computedStyle.backgroundColor;
      if (!styleRecord.fontSize && computedStyle.fontSize) styleRecord.fontSize = computedStyle.fontSize;
      if (!styleRecord.textAlign && computedStyle.textAlign) styleRecord.textAlign = computedStyle.textAlign;
      if (!styleRecord.display && computedStyle.display) styleRecord.display = computedStyle.display;
      if (!styleRecord.flexDirection && computedStyle.flexDirection) styleRecord.flexDirection = computedStyle.flexDirection;
      if (!styleRecord.padding && computedStyle.padding) styleRecord.padding = computedStyle.padding;
    }

    const attributesRecord: Record<string, string> = {};
    for (const attr of Array.from(el.attributes)) {
      attributesRecord[attr.name] = attr.value;
    }

    const hasParent = el.parentElement !== null && el.parentElement.tagName !== 'BODY';

    return {
      tagName: el.tagName,
      style: styleRecord,
      attributes: attributesRecord,
      text: el.textContent || '',
      hasParent
    };
  }, [selectedElementId, htmlContent]);

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
          {/* Viewport Dimension Badge */}
          {customViewportWidth !== null && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 text-blue-400 border border-slate-800 rounded px-2 py-0.5 font-mono text-[10px] font-bold z-50 pointer-events-none shadow-md">
              {customViewportWidth}px
            </div>
          )}

          {/* Viewport Resize Handle */}
          {htmlContent && (
            <div 
              onMouseDown={handleViewportResizeStart}
              className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3 hover:bg-blue-600/40 cursor-col-resize z-50 transition-all flex items-center justify-center border-l border-slate-200/10 group"
              title="Arrastar para Redimensionar Viewport"
            >
              <div className="w-1 h-8 bg-slate-400/40 rounded-full group-hover:bg-blue-300" />
            </div>
          )}

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
              selectedElementId={selectedElementId}
              selectedRect={selectedRect}
              selectedRects={selectedRects}
              hoveredRect={hoveredRect}
              selectedTag={selectedTag}
              selectedTags={selectedTags}
              hoveredTag={hoveredTag}
              quickAction={handleQuickAction}
              onResizeStart={handleResizeStart}
              selectedPadding={selectedPadding}
              selectedDisplay={selectedDisplay}
              selectedFlexDirection={selectedFlexDirection}
              draggedId={draggedId}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
              dropTargetRect={dropTargetRect}
              onDragStart={(id) => setDraggedId(id)}
            />
          )}

          {selectedRect && selectedElementData && (() => {
            const isHUDAbove = selectedRect.top - 50 > 0;
            const topPos = isHUDAbove 
              ? selectedRect.top - 8 
              : selectedRect.top + selectedRect.height + 8;
            const transformVal = isHUDAbove 
              ? 'translate(-50%, -100%)' 
              : 'translate(-50%, 0)';
            const scaleVal = 1 / zoomScale;
            const originVal = isHUDAbove ? 'bottom center' : 'top center';
            const transformCombined = `${transformVal} scale(${scaleVal})`;
            return (
              <div
                className={`absolute z-40 ${draggedId ? 'pointer-events-none' : 'pointer-events-auto'}`}
                style={{
                  left: `${selectedRect.left + selectedRect.width / 2}px`,
                  top: `${topPos}px`,
                  transform: transformCombined,
                  transformOrigin: originVal,
                  transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ContextualHUD
                  tagName={selectedElementData.tagName}
                  style={selectedElementData.style}
                  attributes={selectedElementData.attributes}
                  onUpdateStyles={(styles) => onUpdateStyles?.(selectedElementId!, styles)}
                  onUnwrap={() => onUnwrapElement?.(selectedElementId!)}
                  onWrap={(tag) => onWrapElement?.(selectedElementId!, tag)}
                  onChangeTag={(tag) => onChangeElementTag?.(selectedElementId!, tag)}
                  onClearStyles={() => onClearElementStyles?.(selectedElementId!)}
                  onDuplicate={() => onDuplicateElement?.(selectedElementId!)}
                  onDelete={() => onDeleteElement(selectedElementId!)}
                  onMove={(dir) => onReorderElement?.(selectedElementId!, dir)}
                  onMoveOut={() => onMoveElementOut?.(selectedElementId!)}
                  onGroup={() => onGroupElement?.(selectedElementId!)}
                  onInsertComponent={(type) => onInsertComponent?.(selectedElementId!, type)}
                  hasParent={selectedElementData.hasParent}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
