import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Layers, 
  ChevronRight
} from 'lucide-react';
import type { SemanticElement } from '../types';

export interface CommandItem {
  id: string;
  name: string;
  category: 'Comandos' | 'Ações do Elemento' | 'Viewports' | 'Projeto';
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
  semanticTree: SemanticElement[];
  onSelectElement: (id: string | null) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  commands,
  semanticTree,
  onSelectElement
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Reset search when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Flatten the tree of layers for searching
  const flattenLayers = (nodes: SemanticElement[]): { id: string; name: string }[] => {
    const list: { id: string; name: string }[] = [];
    const traverse = (node: SemanticElement) => {
      const friendlyName = node.classes.length > 0 
        ? `${node.tagName.toLowerCase()}.${node.classes[0]}` 
        : node.tagName.toLowerCase();
      
      const nodeLabel = node.isLocked ? `🔒 ${friendlyName}` : friendlyName;
      list.push({ id: node.id, name: nodeLabel });
      if (node.children) node.children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return list;
  };

  const layersList = flattenLayers(semanticTree);

  // Filter commands and layers
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLayers = layersList.filter(lyr =>
    lyr.name.toLowerCase().includes(search.toLowerCase())
  );

  // Combine items into single list
  const combinedItems = [
    ...filteredCommands.map(cmd => ({ type: 'command' as const, id: cmd.id, data: cmd })),
    ...filteredLayers.map(lyr => ({ type: 'layer' as const, id: lyr.id, data: lyr }))
  ];

  // Adjust selectedIndex bounds
  useEffect(() => {
    if (selectedIndex >= combinedItems.length) {
      setSelectedIndex(Math.max(0, combinedItems.length - 1));
    }
  }, [combinedItems.length, selectedIndex]);

  // Handle arrow keys and Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (combinedItems[selectedIndex]) {
          triggerItem(combinedItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, combinedItems]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = resultsRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const triggerItem = (item: typeof combinedItems[number]) => {
    if (item.type === 'command') {
      item.data.action();
    } else if (item.type === 'layer') {
      onSelectElement(item.data.id);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[480px]">
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-850 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Busque por ações ou camadas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <span className="text-[10px] bg-slate-950 text-slate-500 px-2 py-0.5 border border-slate-850 rounded font-mono">
            ESC
          </span>
        </div>

        {/* Results */}
        <div 
          ref={resultsRef}
          className="flex-1 overflow-y-auto p-2 space-y-4"
        >
          {combinedItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhum resultado encontrado para "{search}"
            </div>
          ) : (
            <>
              {/* Commands */}
              {filteredCommands.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Comandos rápidos
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {combinedItems.map((item, index) => {
                      if (item.type !== 'command') return null;
                      const cmd = item.data;
                      const isActive = index === selectedIndex;
                      return (
                        <div
                          key={cmd.id}
                          data-active={isActive}
                          onClick={() => triggerItem(item)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            isActive 
                              ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 shadow-sm shadow-blue-500/10' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isActive ? 'text-blue-400' : 'text-slate-500'}>
                              {cmd.icon}
                            </span>
                            <span className="text-xs truncate font-medium">{cmd.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-slate-500 font-mono">
                              {cmd.category}
                            </span>
                            {cmd.shortcut && (
                              <span className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                {cmd.shortcut}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Layers */}
              {filteredLayers.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-slate-500" />
                    Ir para Camada
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {combinedItems.map((item, index) => {
                      if (item.type !== 'layer') return null;
                      const lyr = item.data;
                      const isActive = index === selectedIndex;
                      return (
                        <div
                          key={lyr.id}
                          data-active={isActive}
                          onClick={() => triggerItem(item)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                            isActive 
                              ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-xs font-mono truncate">{lyr.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-600 font-mono">
                            ID: {lyr.id}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-2.5 bg-slate-950/60 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
          <div className="flex gap-4">
            <span>↑↓ para navegar</span>
            <span>↵ para executar</span>
          </div>
          <div>
            <span>STRAT Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}
