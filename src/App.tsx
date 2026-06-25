import { useState, useEffect, useMemo } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { PropertyPanel } from './components/PropertyPanel';
import { AIPanel } from './components/AIPanel';
import { 
  injectEditorIds, 
  stripEditorIds, 
  generateSemanticTree, 
  prepareHtmlForPreview 
} from './utils/domHelper';
import { executeAiEdit } from './utils/aiClient';
import type { SemanticElement } from './types';
import { 
  FolderOpen, 
  Sparkles, 
  Download
} from 'lucide-react';

export default function App() {
  const {
    project,
    openDirectory,
    saveFile,
    saveImage
  } = useFileSystem();

  const [activeHtmlPath, setActiveHtmlPath] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>(''); // HTML containing data-editor-id
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [semanticTree, setSemanticTree] = useState<SemanticElement[]>([]);

  // AI & History States
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Persist API Key in local storage
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // Find active file and load it
  const handleSelectFile = (path: string) => {
    if (!project) return;
    const fileItem = project.files[path];
    if (fileItem && fileItem.content !== undefined) {
      setActiveHtmlPath(path);
      
      // Inject IDs and set content
      const htmlWithIds = injectEditorIds(fileItem.content);
      setHtmlContent(htmlWithIds);
      
      // Generate semantic tree
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlWithIds, 'text/html');
      if (doc.body) {
        setSemanticTree(generateSemanticTree(doc.body));
      }

      // Reset selection
      setSelectedElementId(null);
      setHoveredElementId(null);
      setUndoStack([]);
      setAiExplanation('');
    }
  };

  // Auto-select index.html if it exists on project load
  useEffect(() => {
    if (project) {
      const files = Object.keys(project.files);
      const indexFile = files.find(f => f.toLowerCase() === 'index.html') || files.find(f => f.endsWith('.html'));
      if (indexFile) {
        handleSelectFile(indexFile);
      }
    }
  }, [project]);

  // Compute prepared sandbox HTML preview whenever content or files change
  const previewHtml = useMemo(() => {
    if (!htmlContent || !project) return '';
    return prepareHtmlForPreview(htmlContent, project.files);
  }, [htmlContent, project]);

  // Find currently selected element in the semantic tree
  const selectedElement = useMemo(() => {
    if (!selectedElementId || semanticTree.length === 0) return null;
    
    const findNode = (nodes: SemanticElement[]): SemanticElement | null => {
      for (const node of nodes) {
        if (node.id === selectedElementId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };
    return findNode(semanticTree);
  }, [selectedElementId, semanticTree]);

  // Save current HTML change, update semantic tree, and write clean HTML back to filesytem
  const updateHtml = async (newHtml: string, pushToUndo = false) => {
    if (pushToUndo) {
      setUndoStack(prev => [...prev, htmlContent]);
    }
    
    setHtmlContent(newHtml);

    // Update semantic tree
    const parser = new DOMParser();
    const doc = parser.parseFromString(newHtml, 'text/html');
    if (doc.body) {
      setSemanticTree(generateSemanticTree(doc.body));
    }

    // Auto-save cleaned HTML directly to user's disk!
    if (activeHtmlPath) {
      const cleanHtml = stripEditorIds(newHtml);
      await saveFile(activeHtmlPath, cleanHtml);
    }
  };

  // Modify Element Styles
  const handleUpdateStyles = async (elementId: string, styles: Record<string, string>) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);

    if (el) {
      const htmlEl = el as HTMLElement;
      Object.entries(styles).forEach(([key, value]) => {
        if (key === 'src') {
          htmlEl.setAttribute('src', value);
        } else {
          htmlEl.style[key as any] = value;
        }
      });
      await updateHtml(doc.documentElement.outerHTML);
    }
  };

  // Modify Element Text
  const handleUpdateText = async (elementId: string, text: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);

    if (el) {
      el.textContent = text;
      await updateHtml(doc.documentElement.outerHTML);
    }
  };

  // Delete Element
  const handleDeleteElement = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);

    if (el) {
      el.remove();
      setSelectedElementId(null);
      await updateHtml(doc.documentElement.outerHTML, true);
    }
  };

  // Quick Font Size Adjustment
  const handleQuickFontChange = async (elementId: string, direction: 'up' | 'down') => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`) as HTMLElement;

    if (el) {
      let num = 16;
      let unit = 'px';

      const styleSize = el.style.fontSize;
      if (styleSize) {
        const match = styleSize.match(/^(\d+(?:\.\d+)?)(px|rem|em|%|pt)$/);
        if (match) {
          num = parseFloat(match[1]);
          unit = match[2];
        }
      }

      const diff = unit === 'px' ? 2 : 0.1;
      const newSize = direction === 'up' ? num + diff : Math.max(8, num - diff);
      
      el.style.fontSize = `${newSize}${unit}`;
      await updateHtml(doc.documentElement.outerHTML);
    }
  };

  // Upload/Save Image locally and return preview blob URL
  const handleUploadImage = async (relativePath: string, file: File): Promise<string | undefined> => {
    const blobUrl = await saveImage(relativePath, file);
    return blobUrl;
  };

  // Send Prompt to Gemini AI and apply Structured Mutations
  const handleSendPrompt = async (prompt: string) => {
    if (!htmlContent) return;
    
    setAiLoading(true);
    setAiExplanation('IA pensando...');
    
    try {
      const aiResponse = await executeAiEdit(prompt, semanticTree, apiKey);
      setAiExplanation(aiResponse.explanation);

      // Parse and apply mutations
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      let mutationCount = 0;

      // 1. Apply style mutations
      aiResponse.styleMutations.forEach(mut => {
        const el = doc.querySelector(`[data-editor-id="${mut.elementId}"]`) as HTMLElement;
        if (el) {
          Object.entries(mut.styles).forEach(([key, val]) => {
            el.style[key as any] = val;
          });
          mutationCount++;
        }
      });

      // 2. Apply content mutations
      aiResponse.contentMutations.forEach(mut => {
        const el = doc.querySelector(`[data-editor-id="${mut.elementId}"]`);
        if (el) {
          el.textContent = mut.content;
          mutationCount++;
        }
      });

      if (mutationCount > 0) {
        await updateHtml(doc.documentElement.outerHTML, true);
      } else {
        setAiExplanation('Nenhum elemento correspondente foi alterado.');
      }
    } catch (err: any) {
      console.error(err);
      setAiExplanation(`Erro: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Undo AI Change
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousHtml = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    updateHtml(previousHtml);
    setSelectedElementId(null);
    setHoveredElementId(null);
  };

  // Manual Export Download (Alternative to automatic save)
  const handleManualExport = () => {
    if (!htmlContent || !activeHtmlPath) return;
    const cleanHtml = stripEditorIds(htmlContent);
    const blob = new Blob([cleanHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeHtmlPath.split('/').pop() || 'slide.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const projectFileList = project ? Object.keys(project.files) : [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">HTML Presentation Editor</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">PowerPoint for HTML</p>
          </div>
        </div>

        {/* Directory Open / Auto Save Indicator */}
        <div className="flex items-center gap-4">
          {project ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">
                Projeto: <strong className="text-slate-200">{project.name}</strong>
              </span>
              <span className="text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
                Auto-salvamento Ativo
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">Nenhum diretório aberto</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={openDirectory}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Importar Projeto
            </button>

            {activeHtmlPath && (
              <button
                onClick={handleManualExport}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                title="Download do HTML limpo"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Elements Sidebar */}
        <Sidebar
          semanticTree={semanticTree}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          hoveredElementId={hoveredElementId}
          onHoverElement={setHoveredElementId}
          files={projectFileList}
          activeFile={activeHtmlPath}
          onSelectFile={handleSelectFile}
        />

        {/* Central Iframe Canvas Workspace */}
        <Canvas
          htmlContent={previewHtml}
          selectedElementId={selectedElementId}
          hoveredElementId={hoveredElementId}
          onSelectElement={setSelectedElementId}
          onHoverElement={setHoveredElementId}
          onUpdateText={handleUpdateText}
          onDeleteElement={handleDeleteElement}
          onQuickFontChange={handleQuickFontChange}
        />

        {/* Right Properties Panel */}
        <PropertyPanel
          selectedElement={selectedElement}
          onUpdateStyles={handleUpdateStyles}
          onUpdateText={handleUpdateText}
          onUploadImage={handleUploadImage}
        />

      </div>

      {/* AI Assistant bottom panel */}
      <AIPanel
        onSendPrompt={handleSendPrompt}
        apiKey={apiKey}
        onChangeApiKey={handleSaveApiKey}
        loading={aiLoading}
        explanation={aiExplanation}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
      />

    </div>
  );
}
