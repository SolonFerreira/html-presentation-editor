import { useState, useEffect, useRef, useMemo } from 'react';
import type { SemanticElement } from '../types';
import { 
  Folder, 
  FileText, 
  Heading, 
  Image as ImageIcon, 
  MousePointerClick, 
  Layout, 
  Type,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Layers,
  Grid,
  History,
  Plus,
  Search,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  ArrowUp,
  ArrowDown,
  CornerUpLeft,
  FolderPlus,
  FolderMinus,
  Box,
  Code,
  Eraser
} from 'lucide-react';
import { runHtmlValidation } from '../utils/validation';

interface SidebarProps {
  semanticTree: SemanticElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  onSelectElement: (id: string | null, isMulti?: boolean) => void;
  hoveredElementId: string | null;
  onHoverElement: (id: string | null) => void;
  files: string[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  
  htmlContent: string;

  // Actions for Layers Panel
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'up' | 'down') => void;
  onRenameElement: (id: string, newName: string) => void;
  onMoveElement?: (draggedId: string, targetId: string) => void;

  // Structural Actions
  onUnwrapElement: (id: string) => void;
  onWrapElement: (id: string, tag: 'div' | 'section') => void;
  onChangeElementTag: (id: string, newTag: string) => void;
  onClearElementStyles: (id: string) => void;
  onMoveElementOut: (id: string) => void;
  onGroupElement: (id: string) => void;

  // Insert component from library
  onInsertComponent: (htmlSnippet: string) => void;

  // Version history
  versionHistory: { id: string; timestamp: string; description: string }[];
  onRollbackVersion: (versionId: string) => void;
}

type TabType = 'layers' | 'components' | 'history' | 'alerts';
type FilterMode = 'all' | 'hidden' | 'locked' | 'selected';

// Component Library snippets definitions
const COMPONENT_LIBRARY = [
  {
    name: 'Metricas McKinsey',
    category: 'Métricas',
    description: 'Grid de 3 colunas para dados executivos',
    html: `
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 24px; margin-bottom: 24px;">
        <div class="metric-card" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #3b82f6; letter-spacing: 1px; display: block; margin-bottom: 8px;">Crescimento</span>
          <h2 style="font-size: 42px; font-weight: 900; color: #ffffff; margin-bottom: 4px; letter-spacing: -1px;">+18%</h2>
          <h3 style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 8px;">Aumento de Receita</h3>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Melhoria no volume de vendas orgânicas recorrentes.</p>
        </div>
        <div class="metric-card" style="background-color: #111827; border: 1px solid #3b82f6; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #60a5fa; letter-spacing: 1px; display: block; margin-bottom: 8px;">Eficiência</span>
          <h2 style="font-size: 42px; font-weight: 900; color: #ffffff; margin-bottom: 4px; letter-spacing: -1px;">3.5x</h2>
          <h3 style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 8px;">Redução de Custos</h3>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Otimização operacional e automação de processos internos.</p>
        </div>
        <div class="metric-card" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #3b82f6; letter-spacing: 1px; display: block; margin-bottom: 8px;">Conversão</span>
          <h2 style="font-size: 42px; font-weight: 900; color: #ffffff; margin-bottom: 4px; letter-spacing: -1px;">22%</h2>
          <h3 style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 8px;">Taxa de Fechamento</h3>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">Desempenho da equipe comercial corporativa expandida.</p>
        </div>
      </div>
    `
  },
  {
    name: 'FAQ Accordion',
    category: 'Layout',
    description: 'Componente colapsável interativo',
    html: `
      <div class="faq-accordion" style="margin-top: 24px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; width: 100%;">
        <details style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; cursor: pointer;">
          <summary style="font-size: 14px; font-weight: 600; color: #ffffff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            Como funciona a File System Access API?
            <span style="color: #3b82f6;">+</span>
          </summary>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 10px; line-height: 1.5;">Ela permite que o editor leia e salve arquivos diretamente no seu disco local de forma 100% client-side, sem necessidade de servidores externos.</p>
        </details>
        <details style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; cursor: pointer;">
          <summary style="font-size: 14px; font-weight: 600; color: #ffffff; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            Onde as chaves de API do Gemini são salvas?
            <span style="color: #3b82f6;">+</span>
          </summary>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 10px; line-height: 1.5;">As chaves de API são armazenadas exclusivamente no localStorage do seu navegador e nunca são transmitidas para qualquer servidor além do próprio Gemini da Google.</p>
        </details>
      </div>
    `
  },
  {
    name: 'Timeline de Roadmap',
    category: 'Layout',
    description: 'Lista horizontal de entregáveis de projeto',
    html: `
      <div class="roadmap-timeline" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 24px; margin-bottom: 24px;">
        <div style="border-top: 3px solid #3b82f6; padding-top: 12px;">
          <span style="font-size: 10px; font-weight: 700; color: #3b82f6;">Fase 1</span>
          <h4 style="font-size: 14px; font-weight: 600; color: #ffffff; margin-top: 4px;">Setup & Estrutura</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.4;">Inicialização do projeto base e layout principal de 3 painéis.</p>
        </div>
        <div style="border-top: 3px solid #8b5cf6; padding-top: 12px;">
          <span style="font-size: 10px; font-weight: 700; color: #8b5cf6;">Fase 2</span>
          <h4 style="font-size: 14px; font-weight: 600; color: #ffffff; margin-top: 4px;">Edição Visual</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.4;">Bordas de seleção, handles de redimensionamento e sincronia de overlays.</p>
        </div>
        <div style="border-top: 3px solid #10b981; padding-top: 12px;">
          <span style="font-size: 10px; font-weight: 700; color: #10b981;">Fase 3</span>
          <h4 style="font-size: 14px; font-weight: 600; color: #ffffff; margin-top: 4px;">Copiloto de IA</h4>
          <p style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.4;">Prompt inteligente com visualização prévia de diff e aprovação.</p>
        </div>
      </div>
    `
  },
  {
    name: 'Callout Alert Block',
    category: 'Cards',
    description: 'Card de destaque com borda cinza',
    html: `
      <div class="callout-block" style="background-color: #1e293b; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 16px; margin-bottom: 16px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Informação Importante</h4>
        <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin: 0;">Você pode editar os textos clicando duas vezes direto no slide ou alterando os parâmetros visuais no menu lateral.</p>
      </div>
    `
  }
];

// Helper to determine friendly semantic names instead of raw tags
export function getFriendlyNodeName(node: SemanticElement): string {
  if (node.label) return node.label;
  if (node.humanName) return node.humanName;
  
  const tag = node.tagName.toLowerCase();
  const firstClass = node.classes.length > 0 ? `.${node.classes[0]}` : '';
  return tag + firstClass;
}

export function findElementById(nodes: SemanticElement[], id: string): SemanticElement | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findElementById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function hasParentNode(nodes: SemanticElement[], targetId: string): boolean {
  const traverse = (currentNodes: SemanticElement[], parentId: string | null): boolean => {
    for (const node of currentNodes) {
      if (node.id === targetId) {
        return parentId !== null;
      }
      if (node.children && node.children.length > 0) {
        if (traverse(node.children, node.id)) {
          return true;
        }
      }
    }
    return false;
  };
  return traverse(nodes, null);
}

export function Sidebar({
  semanticTree,
  selectedElementId,
  selectedElementIds,
  onSelectElement,
  hoveredElementId,
  onHoverElement,
  files,
  activeFile,
  onSelectFile,
  
  htmlContent,

  onToggleLock,
  onToggleHide,
  onDuplicateElement,
  onDeleteElement,
  onReorderElement,
  onRenameElement,
  onMoveElement,

  onUnwrapElement,
  onWrapElement,
  onChangeElementTag,
  onClearElementStyles,
  onMoveElementOut,
  onGroupElement,

  onInsertComponent,

  versionHistory,
  onRollbackVersion
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('layers');

  // Audit Validation Alerts
  const validationAlerts = useMemo(() => {
    return runHtmlValidation(semanticTree, htmlContent || '');
  }, [semanticTree, htmlContent]);

  const errorCount = validationAlerts.filter(a => a.type === 'error').length;
  const totalAlerts = validationAlerts.length;
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  
  // Drag Over state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [contextMenu]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startRename = (id: string, currentVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentVal);
    setContextMenu(null);
  };

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      onRenameElement(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const getIcon = (role: SemanticElement['role']) => {
    switch (role) {
      case 'slide': return <Layout className="w-3.5 h-3.5 text-emerald-400" />;
      case 'title': return <Heading className="w-3.5 h-3.5 text-sky-400" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-pink-400" />;
      case 'button': return <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />;
      case 'text': return <Type className="w-3.5 h-3.5 text-indigo-400" />;
      case 'card': return <Folder className="w-3.5 h-3.5 text-purple-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Check if a node is visible based on search and filters
  const isNodeVisible = (node: SemanticElement): boolean => {
    const friendlyName = getFriendlyNodeName(node);
    const matchesSearch = friendlyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      node.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterMode === 'locked') matchesFilter = !!node.isLocked;
    else if (filterMode === 'hidden') matchesFilter = !!node.isHidden;
    else if (filterMode === 'selected') matchesFilter = node.id === selectedElementId;
    
    if (matchesSearch && matchesFilter) return true;
    
    if (node.children && node.children.length > 0) {
      return node.children.some(isNodeVisible);
    }
    
    return false;
  };

  // Expand / Collapse all logic
  const getAllParentIds = (nodes: SemanticElement[]): string[] => {
    const ids: string[] = [];
    const traverse = (node: SemanticElement) => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        node.children.forEach(traverse);
      }
    };
    nodes.forEach(traverse);
    return ids;
  };

  const handleExpandAll = () => {
    setCollapsedNodes({});
  };

  const handleCollapseAll = () => {
    const allParentIds = getAllParentIds(semanticTree);
    const collapsedMap: Record<string, boolean> = {};
    allParentIds.forEach(id => {
      collapsedMap[id] = true;
    });
    setCollapsedNodes(collapsedMap);
  };

  // Find selected element lineage for breadcrumbs
  const getSelectedLineage = (nodes: SemanticElement[], targetId: string, currentPath: SemanticElement[] = []): SemanticElement[] | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node];
      if (node.id === targetId) return newPath;
      if (node.children && node.children.length > 0) {
        const found = getSelectedLineage(node.children, targetId, newPath);
        if (found) return found;
      }
    }
    return null;
  };

  const isTechnicalNode = (node: SemanticElement): boolean => {
    const tagName = node.tagName.toLowerCase();
    if ((tagName === 'div' || tagName === 'span') && 
        node.classes.length === 0 && 
        !node.label && 
        (!node.text || node.text.trim().length === 0) &&
        node.role === 'unknown') {
      return true;
    }
    return false;
  };

  // Render tree item recursively
  const renderLayerItem = (node: SemanticElement, depth = 0): React.ReactNode => {
    if (isTechnicalNode(node)) {
      return (
        <>
          {node.children.map(child => renderLayerItem(child, depth))}
        </>
      );
    }

    if (!isNodeVisible(node)) return null;

    const isSelected = selectedElementIds.includes(node.id);
    const isHovered = hoveredElementId === node.id;
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isRenameActive = renamingId === node.id;
    const isDragOver = dragOverId === node.id;

    const friendlyName = getFriendlyNodeName(node);

    return (
      <div 
        key={node.id} 
        className="w-full relative"
        draggable={!node.isLocked && !isRenameActive}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', node.id);
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragOverId !== node.id) setDragOverId(node.id);
        }}
        onDragLeave={() => {
          setDragOverId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverId(null);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId && onMoveElement) {
            onMoveElement(draggedId, node.id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            nodeId: node.id
          });
        }}
      >
        {/* Drop Insertion indicator */}
        {isDragOver && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10 pointer-events-none" />
        )}

        <div
          className={`flex items-center px-2 py-1 mx-1 rounded cursor-pointer transition-all duration-100 group relative border ${
            isSelected 
              ? 'bg-blue-600/20 border-blue-500/30 text-blue-200 shadow-inner' 
              : isHovered 
                ? 'bg-slate-800/50 border-slate-700/50 text-slate-100' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
          style={{ paddingLeft: `${depth * 10 + 6}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement(node.id, e.shiftKey || e.metaKey || e.ctrlKey);
          }}
          onMouseEnter={() => onHoverElement(node.id)}
          onMouseLeave={() => onHoverElement(null)}
        >
          {/* Collapse Arrow */}
          <span 
            onClick={(e) => hasChildren && toggleCollapse(node.id, e)}
            className={`mr-1 p-0.5 hover:bg-slate-700/40 rounded opacity-60 transition-colors ${hasChildren ? 'cursor-pointer' : 'opacity-0 pointer-events-none'}`}
          >
            {hasChildren 
              ? (isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) 
              : <ChevronRight className="w-3 h-3" />
            }
          </span>
          
          <span className="mr-1.5 shrink-0">
            {getIcon(node.role)}
          </span>

          {/* Label / Input for Rename */}
          <div className="flex-1 min-w-0 mr-2">
            {isRenameActive ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(node.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="bg-slate-950 border border-blue-500 rounded px-1 text-xs text-white focus:outline-none w-full py-0.5 font-sans"
              />
            ) : (
              <span 
                onDoubleClick={(e) => startRename(node.id, friendlyName, e)}
                className={`text-xs truncate block font-medium tracking-tight ${node.isHidden ? 'line-through opacity-30' : ''}`}
                title="Dê duplo clique para renomear"
              >
                {friendlyName}
              </span>
            )}
          </div>

          {/* Hover Indicators panel */}
          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 rounded border border-slate-800/80 px-1 py-0.5 shrink-0 ${isSelected ? 'opacity-100' : ''}`}>
            
            {/* Lock */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(node.id); }}
              className={`p-0.5 rounded hover:bg-slate-850 ${node.isLocked ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
              title={node.isLocked ? 'Desbloquear' : 'Bloquear'}
            >
              {node.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            {/* Hide */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleHide(node.id); }}
              className={`p-0.5 rounded hover:bg-slate-850 ${node.isHidden ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
              title={node.isHidden ? 'Exibir' : 'Ocultar'}
            >
              {node.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="mt-0.5">
            {node.children.map(child => renderLayerItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const htmlFiles = files.filter(f => f.endsWith('.html'));

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0 relative">
      
      {/* 1. Files Navigator Header */}
      <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-950/20">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Arquivos
        </span>
        <div className="space-y-0.5">
          {htmlFiles.map(file => (
            <div
              key={file}
              onClick={() => onSelectFile(file)}
              className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeFile === file
                  ? 'bg-blue-600/15 text-blue-200 border border-blue-500/20 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-2 text-blue-400" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tabs Switcher */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 shrink-0">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'layers'
              ? 'border-blue-500 text-blue-400 bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Layers
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'components'
              ? 'border-blue-500 text-blue-400 bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-400 bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-blue-500 text-blue-400 bg-slate-900/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${totalAlerts > 0 ? (errorCount > 0 ? 'text-red-500' : 'text-amber-500') : 'text-slate-500'}`} />
          Alerts
          {totalAlerts > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold text-white ${
              errorCount > 0 ? 'bg-red-500' : 'bg-amber-500'
            }`}>
              {totalAlerts}
            </span>
          )}
        </button>
      </div>

      {/* 3. Global controls (expand/collapse) visible when in layers tab */}
      {activeTab === 'layers' && (
        <div className="px-3 py-1.5 bg-slate-950/20 border-b border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
            Camadas do slide
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExpandAll}
              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 cursor-pointer"
              title="Expandir Tudo"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button 
              onClick={handleCollapseAll}
              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 cursor-pointer"
              title="Recolher Tudo"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Search and Filters */}
      {activeTab === 'layers' && (
        <div className="px-3 py-2 border-b border-slate-800/60 bg-slate-950/10 space-y-1.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar camada... (Cmd+/)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border ${filterMode === 'all' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              Tudo
            </button>
            <button
              onClick={() => setFilterMode('selected')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border ${filterMode === 'selected' ? 'bg-blue-600/10 border-blue-500/25 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
            >
              Foco
            </button>
            <button
              onClick={() => setFilterMode('locked')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border ${filterMode === 'locked' ? 'bg-amber-600/10 border-amber-500/25 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
            >
              Bloqueados
            </button>
            <button
              onClick={() => setFilterMode('hidden')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer border ${filterMode === 'hidden' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 line-through' : 'border-transparent text-slate-500 hover:text-slate-350'}`}
            >
              Ocultos
            </button>
          </div>
        </div>
      )}

      {/* 5. Main content layers tree */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'layers' && (
          <div className="p-2 space-y-0.5">
            {semanticTree.length === 0 ? (
              <p className="text-xs text-slate-600 italic px-2 py-4">Nenhum slide aberto.</p>
            ) : (
              semanticTree.map(node => renderLayerItem(node, 0))
            )}
          </div>
        )}

        {/* Tab 2 Library */}
        {activeTab === 'components' && (
          <div className="p-3 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Injetar Elementos Premium
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {COMPONENT_LIBRARY.map((comp, idx) => (
                <div 
                  key={idx}
                  onClick={() => onInsertComponent(comp.html)}
                  className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-2.5 rounded-lg cursor-pointer hover:bg-slate-900/40 transition-all flex flex-col gap-1 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">
                      {comp.name}
                    </span>
                    <span className="text-[8px] bg-slate-800 text-slate-500 px-1 py-0.5 rounded font-bold uppercase">
                      {comp.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-normal">
                    {comp.description}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                    Inserir no Slide
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3 History */}
        {activeTab === 'history' && (
          <div className="p-3 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Histórico do Arquivo
            </span>
            {versionHistory.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4">Nenhum histórico disponível.</p>
            ) : (
              <div className="relative border-l border-slate-800 ml-1.5 pl-3.5 space-y-4 py-1">
                {versionHistory.map(v => (
                  <div key={v.id} className="relative group/version">
                    <div className="absolute w-2 h-2 rounded-full bg-slate-700 border border-slate-900 -left-[18.5px] top-1 group-hover/version:bg-blue-500 transition-colors" />
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 font-bold">
                        {v.timestamp}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 max-w-[170px] leading-snug">
                        {v.description}
                      </span>
                      <button
                        onClick={() => onRollbackVersion(v.id)}
                        className="text-[10px] text-blue-400 font-bold hover:text-blue-300 mt-1 cursor-pointer w-max"
                      >
                        Restaurar Versão
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4 Alerts/Validation */}
        {activeTab === 'alerts' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in divide-y divide-slate-850 select-none">
            <div className="p-3 bg-slate-950/40 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Auditoria de Qualidade
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {totalAlerts === 0 ? 'Tudo certo!' : `${totalAlerts} pendências`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
              {validationAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 stroke-[1.5]" />
                  <p className="text-slate-300 font-semibold text-xs mb-1">Nenhum problema encontrado!</p>
                  <p className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
                    Seu documento segue boas práticas de acessibilidade, semântica e hierarquia estrutural.
                  </p>
                </div>
              ) : (
                validationAlerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (alert.elementId !== 'root') {
                        onSelectElement(alert.elementId);
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-900/60 ${
                      alert.type === 'error'
                        ? 'border-red-950/45 hover:border-red-900/60'
                        : alert.type === 'warning'
                        ? 'border-amber-950/45 hover:border-amber-900/60'
                        : 'border-blue-950/45 hover:border-blue-900/60'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'error' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      ) : alert.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-slate-300 truncate max-w-[120px]">
                            {alert.elementName}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[7px] font-semibold bg-slate-900 text-slate-400 border border-slate-800 uppercase tracking-wider">
                            {alert.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-455 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Breadcrumbs Footer */}
      {selectedElementId && (
        <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-[9px] text-slate-500 font-mono truncate flex items-center gap-1 shrink-0">
          <span className="font-bold text-slate-600 uppercase text-[8px] tracking-wide shrink-0 mr-1">Caminho:</span>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {getSelectedLineage(semanticTree, selectedElementId)?.map((node, i, arr) => (
              <span key={node.id} className="flex items-center gap-1 shrink-0">
                <span 
                  className="hover:text-blue-400 cursor-pointer transition-colors"
                  onClick={() => onSelectElement(node.id)}
                >
                  {getFriendlyNodeName(node)}
                </span>
                {i < arr.length - 1 && <span className="text-slate-800">/</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CUSTOM FLOATING CONTEXT MENU */}
      {contextMenu && (() => {
        const currentNode = findElementById(semanticTree, contextMenu.nodeId);
        const hasParent = hasParentNode(semanticTree, contextMenu.nodeId);
        const menuHeight = 440;
        const adjustedY = contextMenu.y + menuHeight > window.innerHeight
          ? Math.max(10, window.innerHeight - menuHeight - 10)
          : contextMenu.y;
        return (
          <div
            ref={contextMenuRef}
            className="fixed bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-1.5 z-50 w-52 animate-scale-in glass-panel shadow-premium text-slate-300 font-sans flex flex-col gap-0.5"
            style={{ top: `${adjustedY}px`, left: `${contextMenu.x}px` }}
          >
            {currentNode && (
              <div className="px-2 py-1 text-[10px] text-slate-500 font-medium border-b border-slate-800/80 mb-1 truncate">
                Elemento: <span className="text-slate-400 font-mono font-bold">&lt;{currentNode.tagName.toLowerCase()}&gt;</span>
              </div>
            )}

            <button
              onClick={() => {
                onDuplicateElement(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> Duplicar</span>
              <span className="text-[9px] text-slate-600 font-mono">⌘D</span>
            </button>
            
            <button
              onClick={() => {
                onToggleLock(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              {currentNode?.isLocked ? <Unlock className="w-3.5 h-3.5 text-amber-500" /> : <Lock className="w-3.5 h-3.5" />}
              {currentNode?.isLocked ? 'Desbloquear' : 'Bloquear'}
            </button>

            <button
              onClick={() => {
                onToggleHide(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              {currentNode?.isHidden ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              {currentNode?.isHidden ? 'Exibir' : 'Ocultar'}
            </button>

            <button
              onClick={(e) => startRename(contextMenu.nodeId, currentNode ? getFriendlyNodeName(currentNode) : '', e)}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Type className="w-3.5 h-3.5" /> Renomear Camada
            </button>

            <div className="h-px bg-slate-800/60 my-1" />

            {/* Reordering */}
            <div className="px-2 py-0.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Organizar</div>

            <button
              onClick={() => {
                onReorderElement(contextMenu.nodeId, 'up');
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Mover para Cima
            </button>

            <button
              onClick={() => {
                onReorderElement(contextMenu.nodeId, 'down');
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" /> Mover para Baixo
            </button>

            {hasParent && (
              <button
                onClick={() => {
                  onMoveElementOut(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
              >
                <CornerUpLeft className="w-3.5 h-3.5" /> Mover para Fora (Pai)
              </button>
            )}

            <div className="h-px bg-slate-800/60 my-1" />

            {/* Structural actions */}
            <div className="px-2 py-0.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Estrutura</div>

            <button
              onClick={() => {
                onGroupElement(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Agrupar em Container
            </button>

            <button
              onClick={() => {
                onWrapElement(contextMenu.nodeId, 'div');
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Box className="w-3.5 h-3.5" /> Envolver em &lt;div&gt;
            </button>

            <button
              onClick={() => {
                onWrapElement(contextMenu.nodeId, 'section');
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Envolver em &lt;section&gt;
            </button>

            <button
              onClick={() => {
                onUnwrapElement(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <FolderMinus className="w-3.5 h-3.5" /> Desagrupar (Remover Pai)
            </button>

            <button
              onClick={() => {
                const newTag = prompt(
                  "Digite a nova tag HTML (ex: div, section, button, a, h1, h2, p):", 
                  currentNode?.tagName.toLowerCase()
                );
                if (newTag && newTag.trim()) {
                  onChangeElementTag(contextMenu.nodeId, newTag.trim().toLowerCase());
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" /> Alterar Tag HTML...
            </button>

            <button
              onClick={() => {
                onClearElementStyles(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-slate-800/60 text-xs flex items-center gap-2 cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" /> Limpar Estilos Inline
            </button>

            <div className="h-px bg-slate-800/60 my-1" />

            <button
              onClick={() => {
                onDeleteElement(contextMenu.nodeId);
                setContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1 rounded hover:bg-red-950/40 text-red-400 text-xs flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5 text-red-500" /> Excluir</span>
              <span className="text-[9px] text-red-500/60 font-mono">Del</span>
            </button>
          </div>
        );
      })()}
    </aside>
  );
}
