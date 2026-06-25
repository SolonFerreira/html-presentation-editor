import type { SemanticElement } from '../types';
import { 
  Folder, 
  FileText, 
  Heading, 
  Image, 
  MousePointerClick, 
  Layout, 
  Type,
  ChevronRight,
  ChevronDown
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
}

export function Sidebar({
  semanticTree,
  selectedElementId,
  onSelectElement,
  hoveredElementId,
  onHoverElement,
  files,
  activeFile,
  onSelectFile
}: SidebarProps) {

  const getIcon = (role: SemanticElement['role']) => {
    switch (role) {
      case 'slide': return <Layout className="w-4 h-4 text-emerald-400" />;
      case 'title': return <Heading className="w-4 h-4 text-sky-400" />;
      case 'image': return <Image className="w-4 h-4 text-pink-400" />;
      case 'button': return <MousePointerClick className="w-4 h-4 text-amber-400" />;
      case 'text': return <Type className="w-4 h-4 text-indigo-400" />;
      case 'card': return <Folder className="w-4 h-4 text-purple-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderTreeItem = (node: SemanticElement, depth = 0) => {
    const isSelected = selectedElementId === node.id;
    const isHovered = hoveredElementId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="w-full">
        <div
          className={`flex items-center px-2 py-1.5 mx-1 rounded-md cursor-pointer transition-all duration-150 group ${
            isSelected 
              ? 'bg-blue-600/30 border border-blue-500/50 text-blue-100' 
              : isHovered 
                ? 'bg-slate-800/80 text-slate-100' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement(node.id);
          }}
          onMouseEnter={() => onHoverElement(node.id)}
          onMouseLeave={() => onHoverElement(null)}
        >
          <span className="mr-1.5 opacity-60">
            {hasChildren ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 opacity-0" />}
          </span>
          <span className="mr-2">
            {getIcon(node.role)}
          </span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[10px] opacity-40">
              {node.tagName}
            </span>
            <span className="text-sm truncate">
              {node.text ? `"${node.text}"` : node.role.charAt(0).toUpperCase() + node.role.slice(1)}
            </span>
          </div>
        </div>
        
        {hasChildren && (
          <div className="mt-0.5">
            {node.children.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const htmlFiles = files.filter(f => f.endsWith('.html'));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none">
      {/* HTML Files List */}
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Arquivos HTML
        </h3>
        {htmlFiles.length === 0 ? (
          <p className="text-xs text-slate-600 italic">Nenhum projeto carregado</p>
        ) : (
          <div className="space-y-1">
            {htmlFiles.map(file => (
              <div
                key={file}
                onClick={() => onSelectFile(file)}
                className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm font-medium transition-all ${
                  activeFile === file
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="truncate">{file}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Elements Tree Map */}
      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-2">
          Mapa de Elementos
        </h3>
        {semanticTree.length === 0 ? (
          <p className="text-xs text-slate-600 italic px-3 mt-4">Abra um slide para ver o mapa visual.</p>
        ) : (
          <div className="space-y-0.5">
            {semanticTree.map(node => renderTreeItem(node, 0))}
          </div>
        )}
      </div>
    </aside>
  );
}
