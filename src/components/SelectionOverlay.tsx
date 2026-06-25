import { useState, useEffect } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

interface SelectionOverlayProps {
  selectedElementId?: string | null;
  selectedRect: Rect | null;
  selectedRects?: Rect[];
  hoveredRect: Rect | null;
  selectedTag: string | null;
  selectedTags?: string[];
  hoveredTag: string | null;
  quickAction?: (action: string) => void;
  onResizeStart?: (handle: string, startEvent: React.MouseEvent) => void;
  selectedPadding?: { top: number; right: number; bottom: number; left: number };
  selectedDisplay?: string;
  selectedFlexDirection?: string;
  
  draggedId?: string | null;
  dropTargetId?: string | null;
  dropPosition?: 'before' | 'after' | 'inside';
  dropTargetRect?: Rect | null;
}

export function SelectionOverlay({
  selectedElementId,
  selectedRect,
  selectedRects = [],
  hoveredRect,
  selectedTag,
  hoveredTag,
  quickAction,
  onResizeStart,
  selectedPadding,
  selectedDisplay,
  selectedFlexDirection,
  dropPosition,
  dropTargetRect
}: SelectionOverlayProps) {
  const [altPressed, setAltPressed] = useState(false);

  // Monitor alt/option key press for guidelines measurement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!selectedRect && !hoveredRect && !dropTargetRect) return null;

  // Render guidelines when holding Alt key
  const renderAltGuides = () => {
    if (!altPressed || !selectedRect || !hoveredRect) return null;
    
    const sel = selectedRect;
    const hov = hoveredRect;
    const guides: React.ReactNode[] = [];
    
    // Horizontal distance measurement
    if (sel.left + sel.width <= hov.left) {
      const dist = hov.left - (sel.left + sel.width);
      const topPos = sel.top + sel.height / 2;
      guides.push(
        <div 
          key="dist-r"
          className="absolute border-t border-dashed border-pink-500 flex items-center justify-center pointer-events-none z-30"
          style={{
            top: `${topPos}px`,
            left: `${sel.left + sel.width}px`,
            width: `${dist}px`,
            height: '1px'
          }}
        >
          <span className="bg-pink-600 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded -translate-y-1/2 shadow-sm">
            {Math.round(dist)}
          </span>
        </div>
      );
    } else if (hov.left + hov.width <= sel.left) {
      const dist = sel.left - (hov.left + hov.width);
      const topPos = sel.top + sel.height / 2;
      guides.push(
        <div 
          key="dist-l"
          className="absolute border-t border-dashed border-pink-500 flex items-center justify-center pointer-events-none z-30"
          style={{
            top: `${topPos}px`,
            left: `${hov.left + hov.width}px`,
            width: `${dist}px`,
            height: '1px'
          }}
        >
          <span className="bg-pink-600 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded -translate-y-1/2 shadow-sm">
            {Math.round(dist)}
          </span>
        </div>
      );
    }

    // Vertical distance measurement
    if (sel.top + sel.height <= hov.top) {
      const dist = hov.top - (sel.top + sel.height);
      const leftPos = sel.left + sel.width / 2;
      guides.push(
        <div 
          key="dist-b"
          className="absolute border-l border-dashed border-pink-500 flex flex-col items-center justify-center pointer-events-none z-30"
          style={{
            top: `${sel.top + sel.height}px`,
            left: `${leftPos}px`,
            width: '1px',
            height: `${dist}px`
          }}
        >
          <span className="bg-pink-600 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded translate-x-1/2 shadow-sm">
            {Math.round(dist)}
          </span>
        </div>
      );
    } else if (hov.top + hov.height <= sel.top) {
      const dist = sel.top - (hov.top + hov.height);
      const leftPos = sel.left + sel.width / 2;
      guides.push(
        <div 
          key="dist-t"
          className="absolute border-l border-dashed border-pink-500 flex flex-col items-center justify-center pointer-events-none z-30"
          style={{
            top: `${hov.top + hov.height}px`,
            left: `${leftPos}px`,
            width: '1px',
            height: `${dist}px`
          }}
        >
          <span className="bg-pink-600 text-white font-mono text-[8px] font-bold px-1 py-0.5 rounded translate-x-1/2 shadow-sm">
            {Math.round(dist)}
          </span>
        </div>
      );
    }
    
    return guides;
  };

  const activeRects = selectedRects.length > 0
    ? selectedRects
    : (selectedRect ? [selectedRect] : []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* 1. HOVER OVERLAY (Purple dashed, figma style) */}
      {hoveredRect && (!selectedRect || 
        Math.abs(selectedRect.left - hoveredRect.left) > 1 || 
        Math.abs(selectedRect.top - hoveredRect.top) > 1 || 
        Math.abs(selectedRect.width - hoveredRect.width) > 1 || 
        Math.abs(selectedRect.height - hoveredRect.height) > 1) && (
        <div
          className="absolute border border-purple-500/70 bg-purple-500/5 transition-all duration-75 pointer-events-none shadow-glow-purple"
          style={{
            top: `${hoveredRect.top}px`,
            left: `${hoveredRect.left}px`,
            width: `${hoveredRect.width}px`,
            height: `${hoveredRect.height}px`,
          }}
        >
          {hoveredTag && (
            <div className="absolute top-0 left-0 -translate-y-full bg-purple-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-t shadow-md whitespace-nowrap">
              {hoveredTag.toLowerCase()}
            </div>
          )}
        </div>
      )}

      {/* 2. SELECTION OVERLAY (Blue solid, figma style) */}
      {activeRects.map((rect, index) => {
        const isPrimary = index === 0;
        return (
          <div
            key={`sel-rect-${index}`}
            className={`absolute border-2 border-blue-500 bg-blue-500/5 pointer-events-none ${
              isPrimary ? 'shadow-glow-blue z-20' : 'z-10'
            }`}
            style={{
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
          >
            {isPrimary && (
              <>
                {/* Padding overlays (DevTools green style) */}
                {selectedPadding && (
                  <>
                    {selectedPadding.top > 0 && (
                      <div 
                        className="absolute bg-emerald-500/15 border-b border-dashed border-emerald-500/30"
                        style={{ top: 0, left: 0, right: 0, height: `${selectedPadding.top}px` }}
                      />
                    )}
                    {selectedPadding.bottom > 0 && (
                      <div 
                        className="absolute bg-emerald-500/15 border-t border-dashed border-emerald-500/30"
                        style={{ bottom: 0, left: 0, right: 0, height: `${selectedPadding.bottom}px` }}
                      />
                    )}
                    {selectedPadding.left > 0 && (
                      <div 
                        className="absolute bg-emerald-500/15 border-r border-dashed border-emerald-500/30"
                        style={{ 
                          top: `${selectedPadding.top}px`, 
                          bottom: `${selectedPadding.bottom}px`, 
                          left: 0, 
                          width: `${selectedPadding.left}px` 
                        }}
                      />
                    )}
                    {selectedPadding.right > 0 && (
                      <div 
                        className="absolute bg-emerald-500/15 border-l border-dashed border-emerald-500/30"
                        style={{ 
                          top: `${selectedPadding.top}px`, 
                          bottom: `${selectedPadding.bottom}px`, 
                          right: 0, 
                          width: `${selectedPadding.right}px` 
                        }}
                      />
                    )}
                  </>
                )}

                {/* Flexbox alignment axis guidelines */}
                {selectedDisplay === 'flex' && (
                  <>
                    {selectedFlexDirection === 'column' ? (
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-blue-500/40 flex items-center justify-center">
                        <span className="bg-slate-900/90 text-blue-400 font-mono text-[7px] font-bold px-1 py-0.5 rounded border border-blue-500/20 shadow-md">
                          col ↓
                        </span>
                      </div>
                    ) : (
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0 border-t border-dashed border-blue-500/40 flex items-center justify-center">
                        <span className="bg-slate-900/90 text-blue-400 font-mono text-[7px] font-bold px-1 py-0.5 rounded border border-blue-500/20 shadow-md">
                          row →
                        </span>
                      </div>
                    )}
                    
                    {/* Type Badge inside container */}
                    <div className="absolute top-2 right-2 bg-blue-600/95 text-white font-sans text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md z-20 pointer-events-none">
                      FLEX {selectedFlexDirection === 'column' ? 'COL' : 'ROW'}
                    </div>
                  </>
                )}

                {/* Grid layout visual badge */}
                {selectedDisplay === 'grid' && (
                  <div className="absolute top-2 right-2 bg-indigo-600/95 text-white font-sans text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md z-20 pointer-events-none">
                    GRID
                  </div>
                )}

                {/* Tag Name Badge with Grip Handle */}
                {selectedTag && (
                  <div className="absolute top-0 left-0 -translate-y-full bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-t shadow-md whitespace-nowrap flex items-center gap-1.5 pointer-events-auto">
                    {/* Grip handle for visual Drag-and-Drop */}
                    <span 
                      draggable="true"
                      data-editor-id={selectedElementId}
                      onDragStart={(e) => {
                        if (selectedElementId) {
                          e.dataTransfer.setData('text/plain', selectedElementId);
                          e.dataTransfer.effectAllowed = 'move';
                        }
                      }}
                      className="cursor-grab active:cursor-grabbing hover:bg-blue-700 p-0.5 rounded transition-colors mr-1 flex items-center justify-center shrink-0 border border-blue-500/20"
                      title="Arraste para reposicionar elemento"
                    >
                      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="text-white opacity-80 hover:opacity-100">
                        <path d="M2 2H3V3H2V2ZM2 5H3V6H2V5ZM2 8H3V9H2V8ZM2 11H3V12H2V11ZM5 2H6V3H5V2ZM5 5H6V6H5V5ZM5 8H6V9H5V8ZM5 11H6V12H5V11Z" fill="currentColor"/>
                      </svg>
                    </span>
                    <span>{selectedTag.toLowerCase()}</span>
                    {rect.x !== undefined && rect.y !== undefined && (
                      <span className="text-blue-200 border-l border-blue-400/40 pl-1.5 text-[8px] font-medium">
                        X: {rect.x} Y: {rect.y}
                      </span>
                    )}
                  </div>
                )}

                {/* Width x Height Dimensions Badge */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full bg-blue-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-b shadow-md whitespace-nowrap z-20">
                  {Math.round(rect.width)} × {Math.round(rect.height)}
                </div>

                {/* Discreet Figma Bounding Box Handles */}
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -top-[3.5px] -left-[3.5px] pointer-events-auto cursor-nwse-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('top-left', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -top-[3.5px] -right-[3.5px] pointer-events-auto cursor-nesw-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('top-right', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -bottom-[3.5px] -left-[3.5px] pointer-events-auto cursor-nesw-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('bottom-left', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -bottom-[3.5px] -right-[3.5px] pointer-events-auto cursor-nwse-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('bottom-right', e); }}
                />
                
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm top-1/2 -left-[3.5px] -translate-y-1/2 pointer-events-auto cursor-ew-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('left', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm top-1/2 -right-[3.5px] -translate-y-1/2 pointer-events-auto cursor-ew-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('right', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -top-[3.5px] left-1/2 -translate-x-1/2 pointer-events-auto cursor-ns-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('top', e); }}
                />
                <div 
                  className="absolute w-1.5 h-1.5 bg-white border border-blue-600 rounded-sm -bottom-[3.5px] left-1/2 -translate-x-1/2 pointer-events-auto cursor-ns-resize" 
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart?.('bottom', e); }}
                />

                {/* Quick Action Floating Toolbar */}
                <div className="absolute right-0 top-0 -translate-y-full flex gap-1 pointer-events-auto pb-1 z-30 font-sans">
                  {quickAction && (
                    <div className="flex bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg shadow-premium overflow-hidden text-[10px] text-slate-300 p-0.5">
                      <button
                        onClick={() => quickAction('font-up')}
                        className="px-2 py-1 hover:bg-slate-800 rounded-l-md font-bold transition-colors cursor-pointer border-r border-slate-800"
                        title="Aumentar Texto"
                      >
                        A+
                      </button>
                      <button
                        onClick={() => quickAction('font-down')}
                        className="px-2 py-1 hover:bg-slate-800 font-bold transition-colors cursor-pointer border-r border-slate-800"
                        title="Diminuir Texto"
                      >
                        A-
                      </button>
                      <button
                        onClick={() => quickAction('delete')}
                        className="px-2 py-1 hover:bg-red-950/45 hover:text-red-400 font-semibold transition-colors cursor-pointer rounded-r-md"
                        title="Excluir Elemento (Del)"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* 3. DROP INDICATORS */}
      {dropTargetRect && dropPosition === 'inside' && (
        <div 
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none transition-all duration-75 z-20 shadow-glow-blue animate-pulse"
          style={{
            top: `${dropTargetRect.top}px`,
            left: `${dropTargetRect.left}px`,
            width: `${dropTargetRect.width}px`,
            height: `${dropTargetRect.height}px`,
          }}
        />
      )}

      {dropTargetRect && (dropPosition === 'before' || dropPosition === 'after') && (() => {
        const lineY = dropPosition === 'before' ? dropTargetRect.top : dropTargetRect.top + dropTargetRect.height;
        return (
          <div 
            className="absolute h-1 bg-blue-500 pointer-events-none transition-all duration-75 z-30 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            style={{
              top: `${lineY - 2}px`,
              left: `${dropTargetRect.left}px`,
              width: `${dropTargetRect.width}px`,
            }}
          >
            <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-md" />
          </div>
        );
      })()}

      {/* 4. MEASUREMENT ALIGNMENT LINES */}
      {renderAltGuides()}
    </div>
  );
}
