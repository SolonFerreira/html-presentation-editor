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
import type { SemanticElement, ViewportMode, VersionEntry } from './types';
import { 
  FolderOpen, 
  Sparkles, 
  Download,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2
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

  // Figma/Framer Canvas States
  const [zoomScale, setZoomScale] = useState(1.0);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [presentationMode, setPresentationMode] = useState(false);

  // Undo / Redo / Version History States
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);

  // AI & API States
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  
  // Pending changes for Diff Review (Approval Queue)
  const [pendingChanges, setPendingChanges] = useState<{
    explanation: string;
    styleMutations: any[];
    contentMutations: any[];
    originalHtml: string;
  } | null>(null);

  // Persist API Key
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
      
      const htmlWithIds = injectEditorIds(fileItem.content);
      setHtmlContent(htmlWithIds);
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlWithIds, 'text/html');
      if (doc.body) {
        setSemanticTree(generateSemanticTree(doc.body));
      }

      // Reset states
      setSelectedElementId(null);
      setHoveredElementId(null);
      setUndoStack([]);
      setRedoStack([]);
      setAiExplanation('');
      setPendingChanges(null);

      // Create initial version entry
      const now = new Date();
      setVersionHistory([
        {
          id: 'v-init',
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description: 'Projeto importado',
          htmlContent: htmlWithIds
        }
      ]);
    }
  };

  // Auto-select index.html if it exists
  useEffect(() => {
    if (project) {
      const files = Object.keys(project.files);
      const indexFile = files.find(f => f.toLowerCase() === 'index.html') || files.find(f => f.endsWith('.html'));
      if (indexFile) {
        handleSelectFile(indexFile);
      }
    }
  }, [project]);

  // Compute prepared sandbox HTML preview
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
  const updateHtml = async (newHtml: string, description = 'Alteração visual', pushToUndo = true) => {
    if (pushToUndo) {
      setUndoStack(prev => [...prev, htmlContent]);
      setRedoStack([]); // Clear redo on new action
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
      
      // Update Version History (limit to 10 entries)
      const now = new Date();
      setVersionHistory(prev => [
        {
          id: `v-${Date.now()}`,
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description,
          htmlContent: newHtml
        },
        ...prev.slice(0, 9)
      ]);
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
      await updateHtml(doc.documentElement.outerHTML, `Ajustou ${el.tagName.toLowerCase()}`);
    }
  };

  // Modify Element Text
  const handleUpdateText = async (elementId: string, text: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);

    if (el) {
      el.textContent = text;
      await updateHtml(doc.documentElement.outerHTML, `Editou texto em ${el.tagName.toLowerCase()}`);
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
      await updateHtml(doc.documentElement.outerHTML, `Removeu ${el.tagName.toLowerCase()}`);
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
      await updateHtml(doc.documentElement.outerHTML, `Ajustou tamanho fonte de ${el.tagName.toLowerCase()}`);
    }
  };

  // Upload/Save Image locally
  const handleUploadImage = async (relativePath: string, file: File): Promise<string | undefined> => {
    const blobUrl = await saveImage(relativePath, file);
    return blobUrl;
  };

  // Send Prompt to Gemini AI and load in Diff Review Queue (instead of auto-applying)
  const handleSendPrompt = async (prompt: string) => {
    if (!htmlContent) return;
    
    setAiLoading(true);
    setAiExplanation('IA pensando...');
    
    try {
      const aiResponse = await executeAiEdit(prompt, semanticTree, apiKey);
      
      // Store in pending changes for User Diff Review approval!
      setPendingChanges({
        explanation: aiResponse.explanation,
        styleMutations: aiResponse.styleMutations,
        contentMutations: aiResponse.contentMutations,
        originalHtml: htmlContent
      });
      setAiExplanation('Aguardando aprovação das alterações...');
    } catch (err: any) {
      console.error(err);
      setAiExplanation(`Erro: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Apply Changes from AI Diff Review queue
  const handleApplyChanges = async () => {
    if (!pendingChanges) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(pendingChanges.originalHtml, 'text/html');
    
    let mutationCount = 0;

    // 1. Apply styles
    pendingChanges.styleMutations.forEach(mut => {
      const el = doc.querySelector(`[data-editor-id="${mut.elementId}"]`) as HTMLElement;
      if (el) {
        Object.entries(mut.styles).forEach(([key, val]) => {
          el.style[key as any] = val as string;
        });
        mutationCount++;
      }
    });

    // 2. Apply contents
    pendingChanges.contentMutations.forEach(mut => {
      const el = doc.querySelector(`[data-editor-id="${mut.elementId}"]`);
      if (el) {
        el.textContent = mut.content;
        mutationCount++;
      }
    });

    if (mutationCount > 0) {
      await updateHtml(doc.documentElement.outerHTML, `Ajustes aplicados por IA`, true);
      setAiExplanation('Ajustes aplicados com sucesso!');
    }
    setPendingChanges(null);
  };

  // Discard changes from AI Diff Review queue
  const handleCancelChanges = () => {
    setPendingChanges(null);
    setAiExplanation('Ajustes propostos pela IA descartados.');
  };

  // Standard Undo / Redo Actions
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousHtml = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [...prev, htmlContent]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    
    updateHtml(previousHtml, 'Desfez ação', false);
    setSelectedElementId(null);
    setHoveredElementId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextHtml = redoStack[redoStack.length - 1];
    
    setUndoStack(prev => [...prev, htmlContent]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    
    updateHtml(nextHtml, 'Refez ação', false);
    setSelectedElementId(null);
    setHoveredElementId(null);
  };

  // Rollback to specific version in Version History tab
  const handleRollbackVersion = (versionId: string) => {
    const version = versionHistory.find(v => v.id === versionId);
    if (version) {
      updateHtml(version.htmlContent, `Restaurou: ${version.description}`);
      setSelectedElementId(null);
      setHoveredElementId(null);
    }
  };

  // LAYERS PANEL ACTIONS (Lock, Hide, Duplicate, Delete, Reorder, Rename)
  const handleToggleLock = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el) {
      const isLocked = el.getAttribute('data-editor-locked') === 'true';
      if (isLocked) {
        el.removeAttribute('data-editor-locked');
      } else {
        el.setAttribute('data-editor-locked', 'true');
        if (selectedElementId === elementId) setSelectedElementId(null);
      }
      await updateHtml(doc.documentElement.outerHTML, `${isLocked ? 'Desbloqueou' : 'Bloqueou'} ${el.tagName.toLowerCase()}`);
    }
  };

  const handleToggleHide = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el) {
      const isHidden = el.getAttribute('data-editor-hidden') === 'true';
      if (isHidden) {
        el.removeAttribute('data-editor-hidden');
      } else {
        el.setAttribute('data-editor-hidden', 'true');
        if (selectedElementId === elementId) setSelectedElementId(null);
      }
      await updateHtml(doc.documentElement.outerHTML, `${isHidden ? 'Exibiu' : 'Ocultou'} ${el.tagName.toLowerCase()}`);
    }
  };

  const handleDuplicateElement = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const clone = el.cloneNode(true) as HTMLElement;
      // Ingest new editor ids recursively for clean duplicate separation
      const clonedHtml = injectEditorIds(clone.outerHTML);
      const parsedCloneDoc = parser.parseFromString(clonedHtml, 'text/html');
      const cleanClone = parsedCloneDoc.body.firstElementChild;
      
      if (cleanClone) {
        el.parentNode?.insertBefore(cleanClone, el.nextSibling);
        await updateHtml(doc.documentElement.outerHTML, `Duplicou ${el.tagName.toLowerCase()}`);
      }
    }
  };

  const handleReorderElement = async (elementId: string, direction: 'up' | 'down') => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const parent = el.parentElement;
      if (direction === 'up' && el.previousElementSibling) {
        parent.insertBefore(el, el.previousElementSibling);
      } else if (direction === 'down' && el.nextElementSibling) {
        parent.insertBefore(el.nextElementSibling, el);
      }
      await updateHtml(doc.documentElement.outerHTML, `Reordenou camada ${el.tagName.toLowerCase()}`);
    }
  };

  const handleRenameElement = async (elementId: string, newName: string) => {
    // Standard elements don't store labels, so we can save it as an attribute
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el) {
      el.setAttribute('data-editor-label', newName);
      await updateHtml(doc.documentElement.outerHTML, `Renomeou camada para ${newName}`);
    }
  };

  // INJECT PRE-DESIGNED PREMIUM COMPONENT
  const handleInsertComponent = async (htmlSnippet: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Parse the snippet and inject editor IDs recursively
    const snippetWithIds = injectEditorIds(htmlSnippet);
    const parsedSnippetDoc = parser.parseFromString(snippetWithIds, 'text/html');
    const cleanSnippet = parsedSnippetDoc.body.firstElementChild;

    if (cleanSnippet) {
      if (selectedElementId) {
        // Inject inside selected element container
        const targetContainer = doc.querySelector(`[data-editor-id="${selectedElementId}"]`);
        if (targetContainer) {
          targetContainer.appendChild(cleanSnippet);
          await updateHtml(doc.documentElement.outerHTML, `Injetou componente em ${targetContainer.tagName.toLowerCase()}`);
        }
      } else if (doc.body) {
        // If nothing selected, append to body
        doc.body.appendChild(cleanSnippet);
        await updateHtml(doc.documentElement.outerHTML, `Injetou componente no slide`);
      }
    }
  };

  // Manual Export Download
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

  // Toggle Presentation Mode Fullscreen Esc handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && presentationMode) {
        setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationMode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      
      {/* 1. TOP NAVIGATION BAR */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-40">
        
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6.5 h-6.5 rounded-md bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              STRAT Editor
              <span className="text-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded font-black tracking-wider uppercase">
                Pro
              </span>
            </span>
          </div>
        </div>

        {/* Center: Device Selectors & Zoom Scaling Controls */}
        {!presentationMode && (
          <div className="flex items-center gap-6">
            
            {/* Viewports Device Switcher */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded transition-all cursor-pointer ${viewportMode === 'desktop' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Visualização Desktop (1024x576)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                className={`p-1.5 rounded transition-all cursor-pointer ${viewportMode === 'tablet' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Visualização Tablet (768x1024)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded transition-all cursor-pointer ${viewportMode === 'mobile' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Visualização Mobile (375x812)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                className="p-1 hover:bg-slate-800 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-400 min-w-[36px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.1))}
                className="p-1 hover:bg-slate-800 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomScale(1.0)}
                className="text-[9px] font-semibold text-slate-500 hover:text-slate-300 ml-1 hover:underline cursor-pointer"
              >
                Fit
              </button>
            </div>

            {/* Undo & Redo Quick buttons */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 rounded disabled:opacity-30 text-slate-500 hover:text-slate-300 disabled:pointer-events-none cursor-pointer"
                title="Desfazer (Cmd+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded disabled:opacity-30 text-slate-500 hover:text-slate-300 disabled:pointer-events-none cursor-pointer"
                title="Refazer (Cmd+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* Right Side: Active project info, Import/Export & Presentation Toggle */}
        <div className="flex items-center gap-3">
          
          {/* Active project Name */}
          {project && (
            <div className="hidden md:flex items-center gap-1.5 border border-slate-800 bg-slate-950/60 rounded px-2.5 py-1">
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[120px]" title={project.name}>
                {project.name}
              </span>
            </div>
          )}

          {/* Import / Export & Play Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={openDirectory}
              className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
              Importar
            </button>
            
            {activeHtmlPath && (
              <>
                <button
                  onClick={handleManualExport}
                  className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Exportar
                </button>

                <button
                  onClick={() => setPresentationMode(true)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-md shadow-blue-600/10"
                  title="Modo Apresentação (Tela Cheia)"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Presentation mode floating Esc indicator */}
        {presentationMode && (
          <div className="absolute top-4 right-4 bg-slate-900/90 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-800 shadow-xl pointer-events-none z-50">
            Pressione <kbd className="bg-slate-950 px-1.5 py-0.5 rounded text-white border border-slate-800 font-mono">ESC</kbd> para sair do modo tela cheia
          </div>
        )}

        {/* Left Elements / Sidebar layers */}
        {!presentationMode && (
          <Sidebar
            semanticTree={semanticTree}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            hoveredElementId={hoveredElementId}
            onHoverElement={setHoveredElementId}
            files={projectFileList}
            activeFile={activeHtmlPath}
            onSelectFile={handleSelectFile}
            
            onToggleLock={handleToggleLock}
            onToggleHide={handleToggleHide}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
            onReorderElement={handleReorderElement}
            onRenameElement={handleRenameElement}
            onInsertComponent={handleInsertComponent}
            versionHistory={versionHistory}
            onRollbackVersion={handleRollbackVersion}
          />
        )}

        {/* Central Iframe Canvas Workspace (Responsive width & Zoom) */}
        <Canvas
          htmlContent={previewHtml}
          selectedElementId={selectedElementId}
          hoveredElementId={hoveredElementId}
          onSelectElement={setSelectedElementId}
          onHoverElement={setHoveredElementId}
          onUpdateText={handleUpdateText}
          onDeleteElement={handleDeleteElement}
          onQuickFontChange={handleQuickFontChange}
          
          zoomScale={zoomScale}
          viewportMode={viewportMode}
          presentationMode={presentationMode}
        />

        {/* Right properties detail panel */}
        {!presentationMode && (
          <PropertyPanel
            selectedElement={selectedElement}
            onUpdateStyles={handleUpdateStyles}
            onUpdateText={handleUpdateText}
            onUploadImage={handleUploadImage}
          />
        )}

        {/* Floating AI Command Bar (Raycast Design) */}
        {!presentationMode && activeHtmlPath && (
          <AIPanel
            onSendPrompt={handleSendPrompt}
            apiKey={apiKey}
            onChangeApiKey={handleSaveApiKey}
            loading={aiLoading}
            explanation={aiExplanation}
            onUndo={handleUndo}
            canUndo={undoStack.length > 0}
            
            pendingChanges={pendingChanges ? {
              explanation: pendingChanges.explanation,
              styleCount: pendingChanges.styleMutations.length,
              contentCount: pendingChanges.contentMutations.length
            } : null}
            onApplyChanges={handleApplyChanges}
            onCancelChanges={handleCancelChanges}
          />
        )}

      </div>
    </div>
  );
}
