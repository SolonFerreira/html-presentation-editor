import { useState, useEffect, useMemo } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import { Sidebar } from './components/Sidebar';
import { DiffReviewModal } from './components/DiffReviewModal';
import { Canvas } from './components/Canvas';
import { AIPanel } from './components/AIPanel';
import { 
  injectEditorIds, 
  stripEditorIds, 
  generateSemanticTree, 
  prepareHtmlForPreview,
  getMaxEditorId
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
  Redo2,
  Copy,
  Trash2,
  Lock,
  Eye,
  Maximize,
  Layers,
  Search,
  Component
} from 'lucide-react';
import { CommandPalette } from './components/CommandPalette';
import type { CommandItem } from './components/CommandPalette';

export default function App() {
  const {
    project,
    openDirectory,
    saveFile,
    setProject
  } = useFileSystem();

  const [activeHtmlPath, setActiveHtmlPath] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>(''); // HTML containing data-editor-id
  
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const selectedElementId = selectedElementIds[0] || null;
  const setSelectedElementId = (id: string | null) => {
    setSelectedElementIds(id ? [id] : []);
  };
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

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

  const handleSelectElement = (id: string | null, isMulti = false) => {
    if (!id) {
      setSelectedElementIds([]);
      return;
    }
    if (isMulti) {
      setSelectedElementIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(x => x !== id);
        } else {
          return [...prev, id];
        }
      });
    } else {
      setSelectedElementIds([id]);
    }
  };

  // Auto-select index.html if it exists (only on initial project directory load)
  useEffect(() => {
    if (project && !activeHtmlPath) {
      const files = Object.keys(project.files);
      const indexFile = files.find(f => f.toLowerCase() === 'index.html') || files.find(f => f.endsWith('.html'));
      if (indexFile) {
        handleSelectFile(indexFile);
      }
    }
  }, [project, activeHtmlPath]);

  const handleOpenDirectory = async () => {
    setSelectedElementId(null);
    setHoveredElementId(null);
    setActiveHtmlPath(null);
    await openDirectory();
  };

  // Compute prepared sandbox HTML preview
  const previewHtml = useMemo(() => {
    if (!htmlContent || !project) return '';
    return prepareHtmlForPreview(htmlContent, project.files, false);
  }, [htmlContent, project]);

  const presentationHtml = useMemo(() => {
    if (!htmlContent || !project) return '';
    return prepareHtmlForPreview(htmlContent, project.files, true);
  }, [htmlContent, project]);



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

    // Save in-memory project files state without writing to user's local disk
    if (activeHtmlPath) {
      const cleanHtml = stripEditorIds(newHtml);
      
      setProject(prev => {
        if (!prev) return null;
        const fileItem = prev.files[activeHtmlPath];
        if (!fileItem) return prev;
        return {
          ...prev,
          files: {
            ...prev.files,
            [activeHtmlPath]: {
              ...fileItem,
              content: cleanHtml
            }
          }
        };
      });
      
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
    const idsToUpdate = selectedElementIds.includes(elementId)
      ? selectedElementIds
      : [elementId];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    let updatedCount = 0;

    idsToUpdate.forEach(id => {
      const el = doc.querySelector(`[data-editor-id="${id}"]`);
      if (el) {
        const htmlEl = el as HTMLElement;
        Object.entries(styles).forEach(([key, value]) => {
          const attributeKeys = ['src', 'id', 'title', 'href', 'target', 'alt', 'role', 'aria-label', 'class', 'className'];
          const isAttribute = attributeKeys.includes(key) || key.startsWith('aria-') || key.startsWith('data-');
          
          if (isAttribute) {
            const attrName = key === 'className' ? 'class' : key;
            if (value === '') {
              htmlEl.removeAttribute(attrName);
            } else {
              htmlEl.setAttribute(attrName, value);
            }
          } else {
            htmlEl.style[key as any] = value;
          }
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      const desc = updatedCount === 1 
        ? `Ajustou estilo de ${doc.querySelector(`[data-editor-id="${elementId}"]`)?.tagName.toLowerCase() || 'elemento'}`
        : `Ajustou estilos de ${updatedCount} elementos`;
      await updateHtml(doc.documentElement.outerHTML, desc);
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
    const idsToDelete = selectedElementIds.includes(elementId)
      ? selectedElementIds
      : [elementId];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    let deleteCount = 0;

    idsToDelete.forEach(id => {
      const el = doc.querySelector(`[data-editor-id="${id}"]`);
      if (el) {
        el.remove();
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      setSelectedElementIds([]);
      await updateHtml(doc.documentElement.outerHTML, `Removeu ${deleteCount} elemento(s)`);
    }
  };

  // Quick Font Size Adjustment
  const handleQuickFontChange = async (elementId: string, direction: 'up' | 'down') => {
    const idsToUpdate = selectedElementIds.includes(elementId)
      ? selectedElementIds
      : [elementId];

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    let updatedCount = 0;

    idsToUpdate.forEach(id => {
      const el = doc.querySelector(`[data-editor-id="${id}"]`) as HTMLElement;
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
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await updateHtml(doc.documentElement.outerHTML, `Ajustou tamanho fonte de ${updatedCount} elemento(s)`);
    }
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
      setIsDiffModalOpen(true);
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
      // Ingest new editor ids recursively starting from max + 1
      const startId = getMaxEditorId(htmlContent) + 1;
      const clonedHtml = injectEditorIds(clone.outerHTML, startId);
      const parsedCloneDoc = parser.parseFromString(clonedHtml, 'text/html');
      const cleanClone = parsedCloneDoc.body.firstElementChild;
      if (cleanClone) {
        el.parentNode?.insertBefore(cleanClone, el.nextSibling);
        await updateHtml(doc.documentElement.outerHTML, `Duplicou ${el.tagName.toLowerCase()}`);
      }
    }
  };

  const handleInsertPresetComponent = async (elementId: string | null, componentType: string) => {
    const templates: Record<string, string> = {
      hero: `
        <section class="hero-section" style="padding: 60px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; background-color: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: 800; color: #ffffff;">Revolucione Seu Workflow</h1>
          <p style="font-size: 18px; margin-bottom: 30px; color: #94a3b8; max-width: 600px;">A plataforma definitiva para criar designs premium de maneira ultra-veloz, integrando inteligência artificial e layout flexível.</p>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <a href="#" style="padding: 12px 24px; background-color: #2563eb; color: #ffffff; border-radius: 8px; font-weight: 600; text-decoration: none;">Começar Grátis</a>
            <a href="#" style="padding: 12px 24px; background-color: #334155; color: #f8fafc; border-radius: 8px; font-weight: 600; text-decoration: none;">Ver Demo</a>
          </div>
        </section>
      `,
      features: `
        <section class="features-grid" style="padding: 60px 20px; background-color: #020617; color: #e2e8f0; border-radius: 8px;">
          <h2 style="font-size: 32px; text-align: center; margin-bottom: 40px; font-weight: 700; color: #ffffff;">Recursos Poderosos</h2>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px;">
            <div style="padding: 24px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 24px;">⚡</div>
              <h3 style="font-size: 18px; font-weight: 600; color: #ffffff;">Performance Extrema</h3>
              <p style="font-size: 14px; color: #94a3b8; margin: 0;">Código limpo e otimizado para o máximo de velocidade de carregamento e pontuações de SEO perfeitas.</p>
            </div>
            <div style="padding: 24px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 24px;">🎨</div>
              <h3 style="font-size: 18px; font-weight: 600; color: #ffffff;">Design Moderno</h3>
              <p style="font-size: 14px; color: #94a3b8; margin: 0;">Visual limpo baseado em tokens modernos, gradientes suaves e espaçamentos consistentes.</p>
            </div>
            <div style="padding: 24px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 24px;">🤖</div>
              <h3 style="font-size: 18px; font-weight: 600; color: #ffffff;">Copiloto IA</h3>
              <p style="font-size: 14px; color: #94a3b8; margin: 0;">Refatore layouts e alterne conteúdos instantaneamente com comandos naturais simples.</p>
            </div>
          </div>
        </section>
      `,
      pricing: `
        <section class="pricing-section" style="padding: 60px 20px; background-color: #0f172a; color: #e2e8f0; border-radius: 8px;">
          <h2 style="font-size: 32px; text-align: center; margin-bottom: 12px; font-weight: 700; color: #ffffff;">Planos Flexíveis</h2>
          <p style="font-size: 14px; text-align: center; color: #94a3b8; margin-bottom: 40px;">Escolha o plano ideal para a sua equipe ou projeto individual.</p>
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; max-width: 900px; margin: 0 auto;">
            <div style="padding: 24px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Starter</h3>
                <p style="font-size: 28px; font-weight: 800; color: #ffffff; margin-top: 8px;">Grátis</p>
              </div>
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">Ideal para experimentações e landing pages iniciais.</p>
              <hr style="border: 0; border-top: 1px solid #1e293b; margin: 0;">
              <ul style="font-size: 13px; color: #cbd5e1; display: flex; flex-direction: column; gap: 8px; padding: 0; list-style: none; margin: 0;">
                <li>✓ 1 Projeto Ativo</li>
                <li>✓ Exportação Manual</li>
                <li>✓ Auto-Layout Básico</li>
              </ul>
              <a href="#" style="padding: 10px 16px; background-color: #1e293b; color: #ffffff; text-align: center; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 13px; margin-top: auto;">Começar</a>
            </div>
            <div style="padding: 24px; background-color: #1e1b4b; border: 2px solid #6366f1; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; position: relative;">
              <span style="position: absolute; top: -12px; right: 16px; background-color: #6366f1; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase;">Mais Popular</span>
              <div>
                <h3 style="font-size: 16px; font-weight: 600; color: #c7d2fe; text-transform: uppercase;">Pro</h3>
                <p style="font-size: 28px; font-weight: 800; color: #ffffff; margin-top: 8px;">$29<span style="font-size: 14px; font-weight: 400; color: #c7d2fe;">/mês</span></p>
              </div>
              <p style="font-size: 13px; color: #c7d2fe; margin: 0;">Perfeito para criadores e equipes em crescimento.</p>
              <hr style="border: 0; border-top: 1px solid #312e81; margin: 0;">
              <ul style="font-size: 13px; color: #e0e7ff; display: flex; flex-direction: column; gap: 8px; padding: 0; list-style: none; margin: 0;">
                <li>✓ Projetos Ilimitados</li>
                <li>✓ Suporte IA</li>
                <li>✓ CSS Customizado</li>
              </ul>
              <a href="#" style="padding: 10px 16px; background-color: #6366f1; color: #ffffff; text-align: center; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 13px; margin-top: auto;">Assinar Pro</a>
            </div>
            <div style="padding: 24px; background-color: #020617; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Enterprise</h3>
                <p style="font-size: 28px; font-weight: 800; color: #ffffff; margin-top: 8px;">Custom</p>
              </div>
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">Para organizações que demandam segurança.</p>
              <hr style="border: 0; border-top: 1px solid #1e293b; margin: 0;">
              <ul style="font-size: 13px; color: #cbd5e1; display: flex; flex-direction: column; gap: 8px; padding: 0; list-style: none; margin: 0;">
                <li>✓ SSO & Permissões</li>
                <li>✓ SLA de Disponibilidade</li>
                <li>✓ API Customizada</li>
              </ul>
              <a href="#" style="padding: 10px 16px; background-color: #1e293b; color: #ffffff; text-align: center; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 13px; margin-top: auto;">Falar com Vendas</a>
            </div>
          </div>
        </section>
      `,
      testimonials: `
        <section class="testimonial-section" style="padding: 60px 20px; background-color: #020617; color: #e2e8f0; border-radius: 8px;">
          <h2 style="font-size: 32px; text-align: center; margin-bottom: 40px; font-weight: 700; color: #ffffff;">O Que Dizem de Nós</h2>
          <div style="display: flex; gap: 24px; justify-content: center; max-width: 900px; margin: 0 auto;">
            <div style="flex: 1; padding: 24px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0; font-style: italic;">"O STRAT Editor elevou a produtividade do nosso time de front-end em 300%. A interface sem painéis complexos e a edição contextual são revolucionárias."</p>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #3b82f6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffffff; font-size: 12px;">AF</div>
                <div>
                  <h4 style="font-size: 13px; font-weight: 600; color: #ffffff; margin: 0;">Arthur Faria</h4>
                  <span style="font-size: 11px; color: #94a3b8;">CTO, TechCorp</span>
                </div>
              </div>
            </div>
            <div style="flex: 1; padding: 24px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0; font-style: italic;">"Desenhar HTML semântico com auto-layout se tornou extremamente prazeroso. O controle de margens e o copiloto de IA dão superpoderes de criação."</p>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background-color: #10b981; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ffffff; font-size: 12px;">MM</div>
                <div>
                  <h4 style="font-size: 13px; font-weight: 600; color: #ffffff; margin: 0;">Mariana Melo</h4>
                  <span style="font-size: 11px; color: #94a3b8;">Principal UX Engineer, DesignFlow</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      `,
      footer: `
        <footer class="footer-section" style="padding: 40px 20px; background-color: #0f172a; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 13px; border-radius: 8px;">
          <div style="max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <span style="font-size: 16px; font-weight: 700; color: #ffffff;">STRAT <span style="color: #3b82f6;">Editor</span></span>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">© 2026 STRAT Technologies Inc. Todos os direitos reservados.</p>
            </div>
            <div style="display: flex; gap: 16px;">
              <a href="#" style="color: #94a3b8; text-decoration: none;">Termos</a>
              <a href="#" style="color: #94a3b8; text-decoration: none;">Privacidade</a>
              <a href="#" style="color: #94a3b8; text-decoration: none;">Contato</a>
            </div>
          </div>
        </footer>
      `
    };

    const template = templates[componentType];
    if (!template) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const startId = getMaxEditorId(htmlContent) + 1;
    const templateWithIds = injectEditorIds(template, startId);
    
    const parsedTemplateDoc = parser.parseFromString(templateWithIds, 'text/html');
    const cleanComponent = parsedTemplateDoc.body.firstElementChild;
    
    if (!cleanComponent) return;

    if (elementId) {
      const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
      if (el) {
        const tagNameLower = el.tagName.toLowerCase();
        const isContainer = ['div', 'section', 'article', 'header', 'footer', 'main', 'body'].includes(tagNameLower);
        
        if (isContainer) {
          el.appendChild(cleanComponent);
        } else {
          el.parentNode?.insertBefore(cleanComponent, el.nextSibling);
        }
        await updateHtml(doc.documentElement.outerHTML, `Inseriu Componente ${componentType} em ${el.tagName.toLowerCase()}`);
      }
    } else {
      doc.body.appendChild(cleanComponent);
      await updateHtml(doc.documentElement.outerHTML, `Inseriu Componente ${componentType} no Corpo`);
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

  const handleMoveElement = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const draggedEl = doc.querySelector(`[data-editor-id="${draggedId}"]`);
    const targetEl = doc.querySelector(`[data-editor-id="${targetId}"]`);
    
    if (draggedEl && targetEl && targetEl.parentElement) {
      if (draggedEl.contains(targetEl)) return; // Prevent infinite cycle
      const parent = targetEl.parentElement;
      parent.insertBefore(draggedEl, targetEl);
      await updateHtml(doc.documentElement.outerHTML, `Moveu elemento ${draggedEl.tagName.toLowerCase()}`);
    }
  };

  const handleMoveElementToLocation = async (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => {
    const idsToMove = selectedElementIds.includes(draggedId)
      ? selectedElementIds
      : [draggedId];

    if (idsToMove.includes(targetId)) return; // Prevent target from being moved into itself

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const targetEl = doc.querySelector(`[data-editor-id="${targetId}"]`);
    
    if (targetEl) {
      // Filter out nested selections (e.g. if parent and child are both selected, only move parent!)
      const rootIdsToMove = idsToMove.filter(id => {
        const el = doc.querySelector(`[data-editor-id="${id}"]`);
        if (!el) return false;
        let parent = el.parentElement;
        while (parent) {
          const pId = parent.getAttribute('data-editor-id');
          if (pId && idsToMove.includes(pId)) return false;
          parent = parent.parentElement;
        }
        return true;
      });

      let insertPosRef = targetEl;
      rootIdsToMove.forEach(id => {
        const draggedEl = doc.querySelector(`[data-editor-id="${id}"]`);
        if (draggedEl) {
          // Verify draggedEl is not an ancestor of targetEl to avoid cycle
          if (draggedEl.contains(targetEl)) return;

          if (position === 'inside') {
            targetEl.appendChild(draggedEl);
          } else if (position === 'before') {
            targetEl.parentNode?.insertBefore(draggedEl, insertPosRef);
          } else if (position === 'after') {
            targetEl.parentNode?.insertBefore(draggedEl, insertPosRef.nextSibling);
            insertPosRef = draggedEl; // Advance reference to maintain relative selection order
          }
        }
      });

      const posLabel = position === 'inside' ? 'dentro de' : position === 'before' ? 'antes de' : 'depois de';
      await updateHtml(
        doc.documentElement.outerHTML,
        `Moveu ${rootIdsToMove.length} elemento(s) para ${posLabel} ${targetEl.tagName.toLowerCase()}`
      );
    }
  };

  const handleUnwrapElement = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const parent = el.parentElement;
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      el.remove();
      setSelectedElementId(null);
      await updateHtml(doc.documentElement.outerHTML, `Desagrupou elemento`);
    }
  };

  const handleWrapElement = async (elementId: string, tag: 'div' | 'section') => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const parent = el.parentElement;
      const wrapEl = doc.createElement(tag);
      const startId = getMaxEditorId(htmlContent) + 1;
      wrapEl.setAttribute('data-editor-id', `el-${startId}`);
      wrapEl.setAttribute('data-editor-label', tag === 'div' ? 'Div Wrapper' : 'Section Wrapper');
      
      parent.insertBefore(wrapEl, el);
      wrapEl.appendChild(el);
      
      await updateHtml(doc.documentElement.outerHTML, `Envolveu em ${tag}`);
      setSelectedElementId(`el-${startId}`);
    }
  };

  const handleChangeElementTag = async (elementId: string, newTagName: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const parent = el.parentElement;
      const newTagNameUpper = newTagName.toUpperCase();
      
      // Validation check for tags nesting
      if (newTagNameUpper === 'P' && Array.from(el.querySelectorAll('div, section, p, table, form')).length > 0) {
        alert('Não é possível converter para <p> porque o elemento possui blocos como div/section que invalidariam a hierarquia HTML.');
        return;
      }
      
      const newEl = doc.createElement(newTagNameUpper);
      
      // Copy attributes
      for (const attr of Array.from(el.attributes)) {
        newEl.setAttribute(attr.name, attr.value);
      }
      
      // Conversion rules
      if (newTagNameUpper === 'BUTTON') {
        newEl.removeAttribute('href');
        newEl.removeAttribute('target');
      } else if (newTagNameUpper === 'A') {
        if (!newEl.hasAttribute('href')) {
          newEl.setAttribute('href', '#');
        }
      }
      
      // Move children
      while (el.firstChild) {
        newEl.appendChild(el.firstChild);
      }
      
      parent.replaceChild(newEl, el);
      await updateHtml(doc.documentElement.outerHTML, `Alterou tag para ${newTagName.toLowerCase()}`);
    }
  };

  const handleClearElementStyles = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el) {
      el.removeAttribute('style');
      await updateHtml(doc.documentElement.outerHTML, `Limpou estilos de ${el.tagName.toLowerCase()}`);
    }
  };

  const handleMoveElementOut = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement && el.parentElement.parentElement && el.parentElement.tagName !== 'BODY') {
      const parent = el.parentElement;
      const grandParent = parent.parentElement;
      if (grandParent) {
        grandParent.insertBefore(el, parent.nextSibling);
        await updateHtml(doc.documentElement.outerHTML, `Moveu ${el.tagName.toLowerCase()} para fora`);
      }
    }
  };

  // INJECT PRE-DESIGNED PREMIUM COMPONENT
  const handleInsertComponent = async (htmlSnippet: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Parse the snippet and inject editor IDs starting from max + 1
    const startId = getMaxEditorId(htmlContent) + 1;
    const snippetWithIds = injectEditorIds(htmlSnippet, startId);
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

  // Manual Export (Saves back to disk & triggers download)
  const handleManualExport = async () => {
    if (!htmlContent || !activeHtmlPath) return;
    const cleanHtml = stripEditorIds(htmlContent);
    
    try {
      // 1. Write the cleaned HTML back to the user's disk!
      await saveFile(activeHtmlPath, cleanHtml);
      
      // 2. Trigger browser download as a fallback export file
      const blob = new Blob([cleanHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeHtmlPath.split('/').pop() || 'slide.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao salvar/exportar o arquivo:', err);
    }
  };

  // Group element under a styled div container
  const handleGroupElement = async (elementId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const el = doc.querySelector(`[data-editor-id="${elementId}"]`);
    if (el && el.parentElement) {
      const parent = el.parentElement;
      const groupDiv = doc.createElement('div');
      const startId = getMaxEditorId(htmlContent) + 1;
      groupDiv.setAttribute('data-editor-id', `el-${startId}`);
      groupDiv.setAttribute('data-editor-label', 'Grupo');
      groupDiv.style.display = 'block';
      groupDiv.style.border = '1px dashed rgba(255, 255, 255, 0.15)';
      groupDiv.style.padding = '12px';
      groupDiv.style.borderRadius = '8px';
      
      parent.insertBefore(groupDiv, el);
      groupDiv.appendChild(el);
      
      await updateHtml(doc.documentElement.outerHTML, `Agrupou elemento`);
      setSelectedElementId(`el-${startId}`);
    }
  };

  // Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.hasAttribute('contenteditable') ||
        (activeEl as HTMLElement).isContentEditable
      );

      if (isEditable && e.key !== 'Escape') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // ⌘Z or Ctrl+Z - Undo
      if (cmdKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // ⌘Shift+Z or ⌘Y or Ctrl+Y - Redo
      if ((cmdKey && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdKey && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
      }

      // ⌘K or Ctrl+K - Command Palette
      if (cmdKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }

      // ⌘D or Ctrl+D - Duplicate
      if (cmdKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedElementId) {
          handleDuplicateElement(selectedElementId);
        }
      }

      // ⌘/ or Ctrl+/ - Search layers (focus search input)
      if (cmdKey && e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Delete or Backspace - Delete element
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable) {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      }

      // Esc - Clear selection / Close Palette
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else {
          setSelectedElementId(null);
        }
      }

      // F - Zoom fit (100%)
      if (e.key.toLowerCase() === 'f' && !isEditable) {
        e.preventDefault();
        setZoomScale(1.0);
      }

      // ⌘G or Ctrl+G - Group elements
      if (cmdKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (selectedElementId) {
          handleGroupElement(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, htmlContent, isCommandPaletteOpen, undoStack, redoStack]);

  const projectFileList = project ? Object.keys(project.files) : [];

  const commandPaletteCommands = useMemo<CommandItem[]>(() => {
    return [
      {
        id: 'duplicate',
        name: 'Duplicar Elemento Selecionado',
        category: 'Ações do Elemento',
        shortcut: '⌘D',
        icon: <Copy className="w-3.5 h-3.5" />,
        action: () => {
          if (selectedElementId) handleDuplicateElement(selectedElementId);
        }
      },
      {
        id: 'delete',
        name: 'Excluir Elemento Selecionado',
        category: 'Ações do Elemento',
        shortcut: 'Delete',
        icon: <Trash2 className="w-3.5 h-3.5" />,
        action: () => {
          if (selectedElementId) handleDeleteElement(selectedElementId);
        }
      },
      {
        id: 'lock',
        name: 'Bloquear / Desbloquear Elemento',
        category: 'Ações do Elemento',
        icon: <Lock className="w-3.5 h-3.5" />,
        action: () => {
          if (selectedElementId) handleToggleLock(selectedElementId);
        }
      },
      {
        id: 'hide',
        name: 'Ocultar / Exibir Elemento',
        category: 'Ações do Elemento',
        icon: <Eye className="w-3.5 h-3.5" />,
        action: () => {
          if (selectedElementId) handleToggleHide(selectedElementId);
        }
      },
      {
        id: 'group',
        name: 'Agrupar Elemento',
        category: 'Ações do Elemento',
        shortcut: '⌘G',
        icon: <Layers className="w-3.5 h-3.5" />,
        action: () => {
          if (selectedElementId) handleGroupElement(selectedElementId);
        }
      },
      {
        id: 'viewport-desktop',
        name: 'Alternar para Viewport Desktop',
        category: 'Viewports',
        icon: <Monitor className="w-3.5 h-3.5" />,
        action: () => setViewportMode('desktop')
      },
      {
        id: 'viewport-tablet',
        name: 'Alternar para Viewport Tablet',
        category: 'Viewports',
        icon: <Tablet className="w-3.5 h-3.5" />,
        action: () => setViewportMode('tablet')
      },
      {
        id: 'viewport-mobile',
        name: 'Alternar para Viewport Mobile',
        category: 'Viewports',
        icon: <Smartphone className="w-3.5 h-3.5" />,
        action: () => setViewportMode('mobile')
      },
      {
        id: 'zoom-in',
        name: 'Aumentar Zoom (Zoom In)',
        category: 'Comandos',
        icon: <ZoomIn className="w-3.5 h-3.5" />,
        action: () => setZoomScale(prev => Math.min(2.0, prev + 0.1))
      },
      {
        id: 'zoom-out',
        name: 'Diminuir Zoom (Zoom Out)',
        category: 'Comandos',
        icon: <ZoomOut className="w-3.5 h-3.5" />,
        action: () => setZoomScale(prev => Math.max(0.5, prev - 0.1))
      },
      {
        id: 'zoom-fit',
        name: 'Ajustar Zoom (Fit 100%)',
        category: 'Comandos',
        shortcut: 'F',
        icon: <Maximize className="w-3.5 h-3.5" />,
        action: () => setZoomScale(1.0)
      },
      {
        id: 'undo',
        name: 'Desfazer Última Alteração',
        category: 'Comandos',
        shortcut: '⌘Z',
        icon: <Undo2 className="w-3.5 h-3.5" />,
        action: handleUndo
      },
      {
        id: 'redo',
        name: 'Refazer Ação',
        category: 'Comandos',
        shortcut: '⌘Y',
        icon: <Redo2 className="w-3.5 h-3.5" />,
        action: handleRedo
      },
      {
        id: 'export',
        name: 'Exportar HTML Local',
        category: 'Projeto',
        icon: <Download className="w-3.5 h-3.5" />,
        action: handleManualExport
      },
      {
        id: 'import',
        name: 'Importar Pasta de Projeto',
        category: 'Projeto',
        icon: <FolderOpen className="w-3.5 h-3.5" />,
        action: handleOpenDirectory
      },
      {
        id: 'insert-hero',
        name: 'Inserir Seção: Hero Section',
        category: 'Projeto',
        icon: <Component className="w-3.5 h-3.5 text-blue-400" />,
        action: () => handleInsertPresetComponent(selectedElementId, 'hero')
      },
      {
        id: 'insert-features',
        name: 'Inserir Seção: Features Grid',
        category: 'Projeto',
        icon: <Component className="w-3.5 h-3.5 text-emerald-400" />,
        action: () => handleInsertPresetComponent(selectedElementId, 'features')
      },
      {
        id: 'insert-pricing',
        name: 'Inserir Seção: Pricing Table',
        category: 'Projeto',
        icon: <Component className="w-3.5 h-3.5 text-indigo-400" />,
        action: () => handleInsertPresetComponent(selectedElementId, 'pricing')
      },
      {
        id: 'insert-testimonials',
        name: 'Inserir Seção: Depoimentos',
        category: 'Projeto',
        icon: <Component className="w-3.5 h-3.5 text-purple-400" />,
        action: () => handleInsertPresetComponent(selectedElementId, 'testimonials')
      },
      {
        id: 'insert-footer',
        name: 'Inserir Seção: Footer Moderno',
        category: 'Projeto',
        icon: <Component className="w-3.5 h-3.5 text-slate-400" />,
        action: () => handleInsertPresetComponent(selectedElementId, 'footer')
      }
    ];
  }, [selectedElementId, htmlContent, undoStack, redoStack]);

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
        <div className="flex items-center gap-4">
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

          {!presentationMode && (
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-500 hover:text-slate-350 text-xs transition-all cursor-pointer shadow-inner hover:border-slate-700/60"
            >
              <Search className="w-3 h-3 text-slate-500" />
              <span>Command Palette</span>
              <span className="text-[9px] bg-slate-900 border border-slate-850 px-1 rounded font-mono text-slate-400">
                ⌘K
              </span>
            </button>
          )}
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
              onClick={handleOpenDirectory}
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
            selectedElementIds={selectedElementIds}
            onSelectElement={handleSelectElement}
            hoveredElementId={hoveredElementId}
            onHoverElement={setHoveredElementId}
            files={projectFileList}
            activeFile={activeHtmlPath}
            onSelectFile={handleSelectFile}
            
            htmlContent={htmlContent}

            onToggleLock={handleToggleLock}
            onToggleHide={handleToggleHide}
            onDuplicateElement={handleDuplicateElement}
            onDeleteElement={handleDeleteElement}
            onReorderElement={handleReorderElement}
            onRenameElement={handleRenameElement}
            onMoveElement={handleMoveElement}

            onUnwrapElement={handleUnwrapElement}
            onWrapElement={handleWrapElement}
            onChangeElementTag={handleChangeElementTag}
            onClearElementStyles={handleClearElementStyles}
            onMoveElementOut={handleMoveElementOut}
            onGroupElement={handleGroupElement}

            onInsertComponent={handleInsertComponent}
            versionHistory={versionHistory}
            onRollbackVersion={handleRollbackVersion}
          />
        )}

        {/* Central Iframe Canvas Workspace (Responsive width & Zoom) */}
        <Canvas
          htmlContent={presentationMode ? presentationHtml : previewHtml}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          hoveredElementId={hoveredElementId}
          onSelectElement={handleSelectElement}
          onHoverElement={setHoveredElementId}
          onUpdateText={handleUpdateText}
          onDeleteElement={handleDeleteElement}
          onQuickFontChange={handleQuickFontChange}
          onUpdateStyles={handleUpdateStyles}
          onUnwrapElement={handleUnwrapElement}
          onWrapElement={handleWrapElement}
          onChangeElementTag={handleChangeElementTag}
          onClearElementStyles={handleClearElementStyles}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
          onMoveElementOut={handleMoveElementOut}
          onGroupElement={handleGroupElement}
          onInsertComponent={handleInsertPresetComponent}
          onMoveElementToLocation={handleMoveElementToLocation}
          
          zoomScale={zoomScale}
          onZoomChange={setZoomScale}
          viewportMode={viewportMode}
          presentationMode={presentationMode}
        />



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
            onShowDetails={() => setIsDiffModalOpen(true)}
          />
        )}

        <DiffReviewModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          pendingChanges={pendingChanges}
          semanticTree={semanticTree}
          onApply={() => {
            handleApplyChanges();
            setIsDiffModalOpen(false);
          }}
          onCancel={() => {
            handleCancelChanges();
            setIsDiffModalOpen(false);
          }}
        />

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          commands={commandPaletteCommands}
          semanticTree={semanticTree}
          onSelectElement={handleSelectElement}
        />
      </div>
    </div>
  );
}
