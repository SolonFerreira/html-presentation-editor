import { useMemo, useState } from 'react';
import { 
  X, 
  Check, 
  ShieldAlert, 
  Eye,
  Settings,
  Sparkles,
  FileText
} from 'lucide-react';
import type { SemanticElement } from '../types';

interface DiffReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingChanges: {
    explanation: string;
    styleMutations: { elementId: string; styles: Record<string, string> }[];
    contentMutations: { elementId: string; content: string }[];
    originalHtml: string;
  } | null;
  semanticTree: SemanticElement[];
  onApply: () => void;
  onCancel: () => void;
}

function findElementInTree(nodes: SemanticElement[], id: string): SemanticElement | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findElementInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getOldStyleValues(originalHtml: string, elementId: string, styleKeys: string[]): Record<string, string> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalHtml, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`) as HTMLElement;
    const oldStyles: Record<string, string> = {};
    if (el) {
      styleKeys.forEach(key => {
        oldStyles[key] = el.style[key as any] || '(não definido)';
      });
    }
    return oldStyles;
  } catch (e) {
    return {};
  }
}

function getOldContentValue(originalHtml: string, elementId: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(originalHtml, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    return el ? el.textContent || '(vazio)' : '(não encontrado)';
  } catch (e) {
    return '';
  }
}

export function DiffReviewModal({
  isOpen,
  onClose,
  pendingChanges,
  semanticTree,
  onApply,
  onCancel
}: DiffReviewModalProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  if (!isOpen || !pendingChanges) return null;

  // 1. Group mutations by element ID
  const elementMutations = useMemo(() => {
    const map: Record<string, {
      elementId: string;
      styles: Record<string, string>;
      content?: string;
    }> = {};

    pendingChanges.styleMutations.forEach(mut => {
      if (!map[mut.elementId]) {
        map[mut.elementId] = { elementId: mut.elementId, styles: {} };
      }
      map[mut.elementId].styles = { ...map[mut.elementId].styles, ...mut.styles };
    });

    pendingChanges.contentMutations.forEach(mut => {
      if (!map[mut.elementId]) {
        map[mut.elementId] = { elementId: mut.elementId, styles: {} };
      }
      map[mut.elementId].content = mut.content;
    });

    return Object.values(map);
  }, [pendingChanges]);

  // Set default selected element if none selected
  useMemo(() => {
    if (elementMutations.length > 0 && !selectedElementId) {
      setSelectedElementId(elementMutations[0].elementId);
    }
  }, [elementMutations, selectedElementId]);

  // 2. Compute risk level
  const riskAnalysis = useMemo(() => {
    const totalMutations = pendingChanges.styleMutations.length + pendingChanges.contentMutations.length;
    const hasContentChanges = pendingChanges.contentMutations.length > 0;
    
    let level: 'low' | 'medium' | 'high' = 'low';
    let label = 'Baixo Risco';
    let colorClass = 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
    let description = 'Apenas alterações cosméticas de estilos (cores, espaçamentos, tipografia). Nenhuma tag ou texto principal foi alterado.';

    if (totalMutations > 8 || pendingChanges.contentMutations.some(m => m.content.includes('<'))) {
      level = 'high';
      label = 'Alto Risco';
      colorClass = 'text-red-400 bg-red-950/30 border-red-900/50';
      description = 'Múltiplas alterações em massa ou inserção de HTML. Revise com atenção a disposição visual após aplicar.';
    } else if (hasContentChanges || totalMutations > 3) {
      level = 'medium';
      label = 'Médio Risco';
      colorClass = 'text-amber-400 bg-amber-950/30 border-amber-900/50';
      description = 'Alterações de texto ou atualizações de estilo em múltiplos elementos. Pode modificar o fluxo de leitura.';
    }

    return { level, label, colorClass, description };
  }, [pendingChanges]);

  // Selected element for detailed view
  const activeElementInfo = useMemo(() => {
    if (!selectedElementId) return null;
    const node = findElementInTree(semanticTree, selectedElementId);
    const mut = elementMutations.find(m => m.elementId === selectedElementId);
    if (!mut) return null;

    const styleKeys = Object.keys(mut.styles);
    const oldStyles = getOldStyleValues(pendingChanges.originalHtml, selectedElementId, styleKeys);
    
    let oldContent = '';
    if (mut.content !== undefined) {
      oldContent = getOldContentValue(pendingChanges.originalHtml, selectedElementId);
    }

    return {
      node,
      mut,
      styleKeys,
      oldStyles,
      oldContent
    };
  }, [selectedElementId, elementMutations, semanticTree, pendingChanges]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl glass-panel shadow-premium text-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-900/50 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Revisão de Alterações da IA</h2>
              <p className="text-[10px] text-slate-500">Revise o código e a intenção semântica antes de salvar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left panel: Info & Elements List */}
          <div className="w-1/3 border-r border-slate-800/80 flex flex-col bg-slate-950/20">
            
            {/* Risk Card */}
            <div className="p-4 border-b border-slate-800/80">
              <div className={`flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-md border ${riskAnalysis.colorClass} mb-2`}>
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Nível: {riskAnalysis.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {riskAnalysis.description}
              </p>
            </div>

            {/* Explanation box */}
            <div className="p-4 border-b border-slate-800/80 bg-blue-950/5">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" /> Intenção do Copiloto
              </div>
              <p className="text-xs italic text-slate-300 leading-relaxed line-clamp-4">
                "{pendingChanges.explanation}"
              </p>
            </div>

            {/* Impacted elements title */}
            <div className="px-4 py-2 bg-slate-950/40 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/50">
              Elementos Impactados ({elementMutations.length})
            </div>

            {/* Elements list */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {elementMutations.map(mut => {
                const node = findElementInTree(semanticTree, mut.elementId);
                const isSelected = selectedElementId === mut.elementId;
                const changeTypes = [];
                if (Object.keys(mut.styles).length > 0) changeTypes.push('Estilo');
                if (mut.content !== undefined) changeTypes.push('Texto');
                
                return (
                  <button
                    key={mut.elementId}
                    onClick={() => setSelectedElementId(mut.elementId)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 shadow-sm shadow-blue-900/5' 
                        : 'bg-transparent border-transparent hover:bg-slate-800/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate flex flex-col gap-0.5">
                      <span className="text-xs font-semibold truncate">
                        {node ? (node.label || node.humanName || node.tagName.toLowerCase()) : mut.elementId}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {node ? `<${node.tagName.toLowerCase()}>` : 'tag'} &bull; id: {mut.elementId.substring(3)}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {changeTypes.map(t => (
                        <span 
                          key={t}
                          className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                            t === 'Texto' 
                              ? 'bg-amber-950/30 border-amber-900/40 text-amber-400' 
                              : 'bg-indigo-950/30 border-indigo-900/40 text-indigo-400'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Detail Diff Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950/40 overflow-hidden">
            {activeElementInfo ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Selected element title */}
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      {activeElementInfo.node ? (activeElementInfo.node.label || activeElementInfo.node.humanName) : 'Elemento'}
                    </span>
                    {activeElementInfo.node && (
                      <span className="text-[10px] bg-slate-800 border border-slate-700/60 font-mono px-2 py-0.5 rounded text-slate-400">
                        &lt;{activeElementInfo.node.tagName.toLowerCase()}&gt;
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {selectedElementId}
                  </span>
                </div>

                {/* Diff Viewer Container */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                  
                  {/* 1. Style Changes */}
                  {activeElementInfo.styleKeys.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Settings className="w-3.5 h-3.5 text-indigo-400" /> Alterações de Estilo (Inline)
                      </div>
                      
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80">
                        <table className="w-full text-xs font-mono border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-500 font-sans uppercase tracking-wider text-left">
                              <th className="px-3 py-2 font-bold w-1/3">Propriedade</th>
                              <th className="px-3 py-2 font-bold w-1/3">Antes</th>
                              <th className="px-3 py-2 font-bold w-1/3">Depois</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeElementInfo.styleKeys.map(key => {
                              const beforeVal = activeElementInfo.oldStyles[key];
                              const afterVal = activeElementInfo.mut.styles[key];
                              return (
                                <tr key={key} className="border-b border-slate-900/60 hover:bg-slate-900/20">
                                  <td className="px-3 py-2 text-slate-400 font-semibold">{key}</td>
                                  <td className="px-3 py-2 text-red-400 bg-red-950/10 line-through truncate max-w-[150px]" title={beforeVal}>
                                    {beforeVal}
                                  </td>
                                  <td className="px-3 py-2 text-emerald-400 bg-emerald-950/10 font-bold truncate max-w-[150px]" title={afterVal}>
                                    {afterVal}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. Content Changes */}
                  {activeElementInfo.mut.content !== undefined && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-400" /> Alteração de Texto
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Old Content */}
                        <div className="border border-red-950/40 rounded-lg bg-red-950/5 overflow-hidden flex flex-col">
                          <div className="px-3 py-1.5 bg-red-950/10 border-b border-red-950/40 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                            Antes
                          </div>
                          <div className="p-3 text-xs leading-relaxed text-red-300 font-sans break-words whitespace-pre-wrap flex-1 select-text">
                            {activeElementInfo.oldContent}
                          </div>
                        </div>

                        {/* New Content */}
                        <div className="border border-emerald-950/40 rounded-lg bg-emerald-950/5 overflow-hidden flex flex-col">
                          <div className="px-3 py-1.5 bg-emerald-950/10 border-b border-emerald-950/40 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                            Depois
                          </div>
                          <div className="p-3 text-xs leading-relaxed text-emerald-100 font-semibold font-sans break-words whitespace-pre-wrap flex-1 select-text">
                            {activeElementInfo.mut.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Eye className="w-8 h-8 text-slate-700 animate-pulse" />
                <span className="text-xs">Selecione um elemento para visualizar o diff</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-[10px] text-slate-500 italic">
            Total de {elementMutations.length} elementos modificados pela Inteligência Artificial.
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Descartar Tudo
            </button>
            <button
              onClick={onApply}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold cursor-pointer transition-colors shadow-lg shadow-blue-600/10"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar Alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
