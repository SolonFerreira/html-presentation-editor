interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SelectionOverlayProps {
  selectedRect: Rect | null;
  hoveredRect: Rect | null;
  selectedTag: string | null;
  hoveredTag: string | null;
  quickAction?: (action: string) => void;
}

export function SelectionOverlay({
  selectedRect,
  hoveredRect,
  selectedTag,
  hoveredTag,
  quickAction
}: SelectionOverlayProps) {
  if (!selectedRect && !hoveredRect) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* HOVER OVERLAY */}
      {hoveredRect && (!selectedRect || 
        selectedRect.left !== hoveredRect.left || 
        selectedRect.top !== hoveredRect.top || 
        selectedRect.width !== hoveredRect.width || 
        selectedRect.height !== hoveredRect.height) && (
        <div
          className="absolute border border-dashed border-purple-500/60 bg-purple-500/5 transition-all duration-75 pointer-events-none"
          style={{
            top: `${hoveredRect.top}px`,
            left: `${hoveredRect.left}px`,
            width: `${hoveredRect.width}px`,
            height: `${hoveredRect.height}px`,
          }}
        >
          {hoveredTag && (
            <div className="absolute top-0 left-0 -translate-y-full bg-purple-600 text-white font-mono text-[9px] px-1 py-0.5 rounded shadow-md whitespace-nowrap">
              {hoveredTag.toLowerCase()}
            </div>
          )}
        </div>
      )}

      {/* SELECTION OVERLAY */}
      {selectedRect && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/5 pointer-events-none"
          style={{
            top: `${selectedRect.top}px`,
            left: `${selectedRect.left}px`,
            width: `${selectedRect.width}px`,
            height: `${selectedRect.height}px`,
          }}
        >
          {/* Tag Name Badge */}
          {selectedTag && (
            <div className="absolute top-0 left-0 -translate-y-full bg-blue-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-t shadow-md whitespace-nowrap flex items-center gap-1.5 pointer-events-auto">
              <span>{selectedTag.toLowerCase()}</span>
            </div>
          )}

          {/* Bounding box handles (8-point resize visualization) */}
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -top-1 -left-1" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -top-1 -right-1" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -bottom-1 -left-1" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -bottom-1 -right-1" />
          
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm top-1/2 -left-1 -translate-y-1/2" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm top-1/2 -right-1 -translate-y-1/2" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -top-1 left-1/2 -translate-x-1/2" />
          <div className="absolute w-2 h-2 bg-white border border-blue-600 rounded-sm -bottom-1 left-1/2 -translate-x-1/2" />

          {/* Quick Action Buttons Toolbar */}
          <div 
            className="absolute right-0 top-0 -translate-y-full flex gap-1 pointer-events-auto pb-1"
          >
            {quickAction && (
              <div className="flex bg-slate-900 border border-slate-800 rounded shadow-md overflow-hidden text-xs text-slate-300">
                <button
                  onClick={() => quickAction('font-up')}
                  className="px-2 py-0.5 hover:bg-slate-800 border-r border-slate-800 font-bold"
                  title="Aumentar Texto"
                >
                  A+
                </button>
                <button
                  onClick={() => quickAction('font-down')}
                  className="px-2 py-0.5 hover:bg-slate-800 border-r border-slate-800 font-bold"
                  title="Diminuir Texto"
                >
                  A-
                </button>
                <button
                  onClick={() => quickAction('delete')}
                  className="px-2 py-0.5 hover:bg-red-950 hover:text-red-400 font-medium"
                  title="Excluir Elemento"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
