import { useState } from 'react';
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
  ArrowUp,
  ArrowDown,
  Layers,
  Grid,
  History,
  Plus
} from 'lucide-react';

interface SidebarProps {
  semanticTree: SemanticElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  hoveredElementId: string | null;
  onHoverElement: (id: string | null) => void;
  files: string[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  
  // New actions for Layers Panel
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'up' | 'down') => void;
  onRenameElement: (id: string, newName: string) => void;

  // Insert component from library
  onInsertComponent: (htmlSnippet: string) => void;

  // Version history
  versionHistory: { id: string; timestamp: string; description: string }[];
  onRollbackVersion: (versionId: string) => void;
}

type TabType = 'layers' | 'components' | 'history';

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

export function Sidebar({
  semanticTree,
  selectedElementId,
  onSelectElement,
  hoveredElementId,
  onHoverElement,
  files,
  activeFile,
  onSelectFile,
  
  onToggleLock,
  onToggleHide,
  onDuplicateElement,
  onDeleteElement,
  onReorderElement,
  onRenameElement,

  onInsertComponent,

  versionHistory,
  onRollbackVersion
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('layers');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startRename = (id: string, currentVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentVal);
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

  const renderLayerItem = (node: SemanticElement, depth = 0) => {
    const isSelected = selectedElementId === node.id;
    const isHovered = hoveredElementId === node.id;
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isRenameActive = renamingId === node.id;

    const friendlyName = node.tagName.toLowerCase() + (node.classes.length > 0 ? `.${node.classes[0]}` : '');

    return (
      <div key={node.id} className="w-full">
        <div
          className={`flex items-center px-2 py-1 mx-1 rounded cursor-pointer transition-all duration-100 group relative border ${
            isSelected 
              ? 'bg-blue-600/20 border-blue-500/30 text-blue-200' 
              : isHovered 
                ? 'bg-slate-800/60 border-slate-700/50 text-slate-100' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
          }`}
          style={{ paddingLeft: `${depth * 8 + 6}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement(node.id);
          }}
          onMouseEnter={() => onHoverElement(node.id)}
          onMouseLeave={() => onHoverElement(null)}
        >
          {/* Collapse Indicator */}
          <span 
            onClick={(e) => hasChildren && toggleCollapse(node.id, e)}
            className={`mr-1 p-0.5 hover:bg-slate-700/50 rounded opacity-60 transition-colors ${hasChildren ? 'cursor-pointer' : 'opacity-0 pointer-events-none'}`}
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
                className="bg-slate-950 border border-blue-500 rounded px-1 text-xs text-white focus:outline-none w-full py-0.5"
              />
            ) : (
              <span 
                onDoubleClick={(e) => startRename(node.id, friendlyName, e)}
                className={`text-xs truncate block font-mono ${node.isHidden ? 'line-through opacity-40' : ''}`}
                title="Double click to rename layer"
              >
                {friendlyName}
              </span>
            )}
          </div>

          {/* Actions panel visible on hover / active */}
          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 rounded border border-slate-700/40 px-1 py-0.5 shrink-0 ${isSelected ? 'opacity-100' : ''}`}>
            
            {/* Lock toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(node.id); }}
              className={`p-0.5 rounded hover:bg-slate-700/50 ${node.isLocked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
              title={node.isLocked ? 'Desbloquear Elemento' : 'Bloquear Elemento'}
            >
              {node.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>

            {/* Visibility toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleHide(node.id); }}
              className={`p-0.5 rounded hover:bg-slate-700/50 ${node.isHidden ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              title={node.isHidden ? 'Exibir' : 'Ocultar'}
            >
              {node.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>

            {/* Reorder Up */}
            <button
              onClick={(e) => { e.stopPropagation(); onReorderElement(node.id, 'up'); }}
              className="p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300"
              title="Subir Camada"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            {/* Reorder Down */}
            <button
              onClick={(e) => { e.stopPropagation(); onReorderElement(node.id, 'down'); }}
              className="p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300"
              title="Descer Camada"
            >
              <ArrowDown className="w-3 h-3" />
            </button>

            {/* Duplicate */}
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicateElement(node.id); }}
              className="p-0.5 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300"
              title="Duplicar"
            >
              <Copy className="w-3 h-3" />
            </button>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteElement(node.id); }}
              className="p-0.5 rounded hover:bg-red-950/40 text-slate-500 hover:text-red-400"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3" />
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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0">
      
      {/* Files Navigator Header */}
      <div className="p-3 border-b border-slate-800 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Arquivos da Apresentação
        </span>
        <div className="space-y-0.5">
          {htmlFiles.map(file => (
            <div
              key={file}
              onClick={() => onSelectFile(file)}
              className={`flex items-center px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                activeFile === file
                  ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-2 text-blue-400" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
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
      </div>

      {/* Content Container based on Active Tab */}
      <div className="flex-1 overflow-y-auto">
        
        {/* TAB 1: LAYERS TREE VIEW */}
        {activeTab === 'layers' && (
          <div className="p-2 space-y-0.5">
            {semanticTree.length === 0 ? (
              <p className="text-xs text-slate-600 italic px-2 py-4">Nenhum slide aberto.</p>
            ) : (
              semanticTree.map(node => renderLayerItem(node, 0))
            )}
          </div>
        )}

        {/* TAB 2: COMPONENT LIBRARY */}
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

        {/* TAB 3: VERSION HISTORY */}
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
                    {/* Circle bullet */}
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

      </div>
    </aside>
  );
}
