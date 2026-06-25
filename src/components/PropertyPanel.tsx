import { useState, useEffect } from 'react';
import type { SemanticElement } from '../types';
import { 
  Type, 
  Paintbrush, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Upload,
  Code,
  Layout as LayoutIcon,
  Sliders,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  ClipboardList,
  SlidersHorizontal,
  Maximize2
} from 'lucide-react';

interface PropertyPanelProps {
  selectedElement: SemanticElement | null;
  onUpdateStyles: (elementId: string, styles: Record<string, string>) => void;
  onUpdateText: (elementId: string, text: string) => void;
  onUploadImage: (relativePath: string, file: File) => Promise<string | undefined>;
}

type PanelTab = 'design' | 'inspect';

export function PropertyPanel({
  selectedElement,
  onUpdateStyles,
  onUpdateText,
  onUploadImage
}: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('design');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Section collapsible states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    content: false,
    typography: false,
    layout: false,
    flexGrid: false,
    spacing: false,
    dimensions: false,
    positioning: false,
    background: false,
    borders: false,
    effects: false,
    interactions: false,
    htmlAttributes: false,
    accessibility: false
  });

  // Local state for copy/paste properties
  const [copiedStyle, setCopiedStyle] = useState<{ key: string; value: string } | null>(null);

  // Form states synced with selected element
  const [localText, setLocalText] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [color, setColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [borderRadius, setBorderRadius] = useState('');
  const [marginTop, setMarginTop] = useState('');
  const [marginBottom, setMarginBottom] = useState('');
  const [marginLeft, setMarginLeft] = useState('');
  const [marginRight, setMarginRight] = useState('');
  const [padding, setPadding] = useState('');
  const [borderWidth, setBorderWidth] = useState('');
  const [borderColor, setBorderColor] = useState('');
  const [borderStyle, setBorderStyle] = useState('');
  const [boxShadow, setBoxShadow] = useState('');
  const [display, setDisplay] = useState('');
  const [flexDirection, setFlexDirection] = useState('');
  const [alignItems, setAlignItems] = useState('');
  const [justifyContent, setJustifyContent] = useState('');
  const [gap, setGap] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [opacity, setOpacity] = useState('');
  const [lineHeight, setLineHeight] = useState('');
  const [letterSpacing, setLetterSpacing] = useState('');

  // Additional positioning / sizing properties
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [position, setPosition] = useState('');
  const [top, setTop] = useState('');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [bottom, setBottom] = useState('');
  const [zIndex, setZIndex] = useState('');

  // Interactions properties
  const [cursor, setCursor] = useState('');
  const [transition, setTransition] = useState('');
  const [pointerEvents, setPointerEvents] = useState('');

  // HTML attributes
  const [elementIdAttr, setElementIdAttr] = useState('');
  const [titleAttr, setTitleAttr] = useState('');
  const [hrefAttr, setHrefAttr] = useState('');
  const [targetAttr, setTargetAttr] = useState('');

  // Accessibility attributes
  const [altAttr, setAltAttr] = useState('');
  const [roleAttr, setRoleAttr] = useState('');
  const [ariaLabelAttr, setAriaLabelAttr] = useState('');

  // Sync state when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setLocalText(selectedElement.text || '');
      setFontSize(selectedElement.style.fontSize || '');
      setFontWeight(selectedElement.style.fontWeight || '');
      setColor(selectedElement.style.color || '');
      setBgColor(selectedElement.style.backgroundColor || '');
      setBorderRadius(selectedElement.style.borderRadius || '');
      setMarginTop(selectedElement.style.marginTop || '');
      setMarginBottom(selectedElement.style.marginBottom || '');
      setMarginLeft(selectedElement.style.marginLeft || '');
      setMarginRight(selectedElement.style.marginRight || '');
      setPadding(selectedElement.style.padding || '');
      setBorderWidth(selectedElement.style.borderWidth || '');
      setBorderColor(selectedElement.style.borderColor || '');
      setBorderStyle(selectedElement.style.borderStyle || '');
      setBoxShadow(selectedElement.style.boxShadow || '');
      setDisplay(selectedElement.style.display || '');
      setFlexDirection(selectedElement.style.flexDirection || '');
      setAlignItems(selectedElement.style.alignItems || '');
      setJustifyContent(selectedElement.style.justifyContent || '');
      setGap(selectedElement.style.gap || '');
      setWidth(selectedElement.style.width || '');
      setHeight(selectedElement.style.height || '');
      setOpacity(selectedElement.style.opacity || '');
      setLineHeight(selectedElement.style.lineHeight || '');
      setLetterSpacing(selectedElement.style.letterSpacing || '');

      // Additional properties
      setMaxWidth(selectedElement.style.maxWidth || '');
      setMaxHeight(selectedElement.style.maxHeight || '');
      setPosition(selectedElement.style.position || '');
      setTop(selectedElement.style.top || '');
      setLeft(selectedElement.style.left || '');
      setRight(selectedElement.style.right || '');
      setBottom(selectedElement.style.bottom || '');
      setZIndex(selectedElement.style.zIndex || '');
      setCursor(selectedElement.style.cursor || '');
      setTransition(selectedElement.style.transition || '');
      setPointerEvents(selectedElement.style.pointerEvents || '');

      const attrs = selectedElement.attributes || {};
      setElementIdAttr(attrs.id || '');
      setTitleAttr(attrs.title || '');
      setHrefAttr(attrs.href || '');
      setTargetAttr(attrs.target || '');
      setAltAttr(attrs.alt || '');
      setRoleAttr(attrs.role || '');
      setAriaLabelAttr(attrs['aria-label'] || '');
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <aside className="w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center select-none h-full shrink-0 relative">
        <Paintbrush className="w-10 h-10 text-slate-700 mb-3 stroke-[1.5]" />
        <h3 className="text-slate-400 font-semibold mb-1 text-xs">Nenhum elemento selecionado</h3>
        <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
          Selecione qualquer elemento no slide ou na árvore de camadas para editar suas propriedades.
        </p>
      </aside>
    );
  }

  const handleStyleChange = (key: string, value: string) => {
    onUpdateStyles(selectedElement.id, { [key]: value });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    onUpdateText(selectedElement.id, val);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const relativePath = `images/${file.name}`;
      const newBlobUrl = await onUploadImage(relativePath, file);
      if (newBlobUrl) {
        onUpdateStyles(selectedElement.id, { src: relativePath });
      }
    }
  };

  const handleCopyHtml = () => {
    const classesStr = selectedElement.classes.length > 0 ? ` class="${selectedElement.classes.join(' ')}"` : '';
    const styleEntries = Object.entries(selectedElement.style)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
      .join('; ');
    const styleStr = styleEntries ? ` style="${styleEntries}"` : '';
    const mockHtml = `<${selectedElement.tagName.toLowerCase()}${classesStr}${styleStr} data-editor-id="${selectedElement.id}">\n  ${selectedElement.text || '...'}\n</${selectedElement.tagName.toLowerCase()}>`;
    
    navigator.clipboard.writeText(mockHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Property Actions: Copy, Paste, Reset
  const copyProperty = (key: string, value: string) => {
    setCopiedStyle({ key, value });
  };

  const pasteProperty = (key: string) => {
    if (copiedStyle && copiedStyle.key === key) {
      handleStyleChange(key, copiedStyle.value);
    }
  };

  const resetProperty = (key: string) => {
    handleStyleChange(key, '');
    // Reset local state immediately
    switch(key) {
      case 'fontSize': setFontSize(''); break;
      case 'fontWeight': setFontWeight(''); break;
      case 'color': setColor(''); break;
      case 'backgroundColor': setBgColor(''); break;
      case 'borderRadius': setBorderRadius(''); break;
      case 'marginTop': setMarginTop(''); break;
      case 'marginBottom': setMarginBottom(''); break;
      case 'marginLeft': setMarginLeft(''); break;
      case 'marginRight': setMarginRight(''); break;
      case 'padding': setPadding(''); break;
      case 'borderWidth': setBorderWidth(''); break;
      case 'borderColor': setBorderColor(''); break;
      case 'borderStyle': setBorderStyle(''); break;
      case 'boxShadow': setBoxShadow(''); break;
      case 'display': setDisplay(''); break;
      case 'flexDirection': setFlexDirection(''); break;
      case 'alignItems': setAlignItems(''); break;
      case 'justifyContent': setJustifyContent(''); break;
      case 'gap': setGap(''); break;
      case 'width': setWidth(''); break;
      case 'height': setHeight(''); break;
      case 'opacity': setOpacity(''); break;
      case 'lineHeight': setLineHeight(''); break;
      case 'letterSpacing': setLetterSpacing(''); break;
      case 'maxWidth': setMaxWidth(''); break;
      case 'maxHeight': setMaxHeight(''); break;
      case 'position': setPosition(''); break;
      case 'top': setTop(''); break;
      case 'left': setLeft(''); break;
      case 'right': setRight(''); break;
      case 'bottom': setBottom(''); break;
      case 'zIndex': setZIndex(''); break;
      case 'cursor': setCursor(''); break;
      case 'transition': setTransition(''); break;
      case 'pointerEvents': setPointerEvents(''); break;
      case 'id': setElementIdAttr(''); break;
      case 'title': setTitleAttr(''); break;
      case 'href': setHrefAttr(''); break;
      case 'target': setTargetAttr(''); break;
      case 'alt': setAltAttr(''); break;
      case 'role': setRoleAttr(''); break;
      case 'aria-label': setAriaLabelAttr(''); break;
    }
  };

  const renderPropertyActions = (key: string, currentValue: string) => {
    const canPaste = copiedStyle && copiedStyle.key === key;
    return (
      <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity ml-1 shrink-0">
        <button
          onClick={() => copyProperty(key, currentValue)}
          disabled={!currentValue}
          className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-all cursor-pointer hover:bg-slate-800"
          title="Copiar Valor"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => pasteProperty(key)}
          disabled={!canPaste}
          className="p-1 rounded text-slate-500 hover:text-slate-350 disabled:opacity-25 transition-all cursor-pointer hover:bg-slate-800"
          title={`Colar (${copiedStyle?.value})`}
        >
          <ClipboardList className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => resetProperty(key)}
          disabled={!currentValue}
          className="p-1 rounded text-slate-500 hover:text-red-400 disabled:opacity-20 transition-all cursor-pointer hover:bg-slate-800"
          title="Resetar Estilo"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  const tag = selectedElement.tagName.toUpperCase();
  const isImg = tag === 'IMG';

  return (
    <aside className="w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0 relative">
      
      {/* 1. Header switcher */}
      <div className="border-b border-slate-800 bg-slate-950/40 p-2 flex gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'design'
              ? 'bg-slate-800 text-white shadow-inner border border-slate-700/50'
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Design
        </button>
        <button
          onClick={() => setActiveTab('inspect')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inspect'
              ? 'bg-slate-800 text-white shadow-inner border border-slate-700/50'
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Inspect
        </button>
      </div>

      {/* 2. Main content properties */}
      <div className="flex-1 overflow-y-auto">
        
        {activeTab === 'design' && (
          <div className="divide-y divide-slate-800/60">
            
            {/* Identity segment */}
            <div className="p-3.5 flex justify-between items-center bg-slate-950/20">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                {selectedElement.tagName.toLowerCase()}
              </span>
              {selectedElement.classes.length > 0 && (
                <span className="text-[10px] text-blue-400 font-mono truncate max-w-[170px]" title={selectedElement.classes.join(', ')}>
                  .{selectedElement.classes[0]}
                </span>
              )}
            </div>

            {/* FOLDER 1: Conteúdo */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('content')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  Conteúdo
                </span>
                {collapsedSections.content ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.content && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  {/* Text contents input (Text nodes only) */}
                  {!isImg && selectedElement.text !== undefined && (
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Texto</span>
                      </div>
                      <textarea
                        value={localText}
                        onChange={handleTextChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-h-[50px] font-sans"
                      />
                    </div>
                  )}

                  {/* Src Upload segment (Image asset only) */}
                  {isImg && (
                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Arquivo de Imagem</span>
                      <div className="border border-dashed border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-950 hover:bg-slate-900 transition-colors cursor-pointer group relative">
                        <Upload className="w-5 h-5 text-slate-500 group-hover:text-blue-500 mb-1.5" />
                        <span className="text-[10px] text-slate-400 font-medium">Substituir Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOLDER 2: Tipografia (Hidden for images) */}
            {!isImg && (
              <div className="p-1">
                <div 
                  onClick={() => toggleSection('typography')}
                  className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-slate-400" />
                    Tipografia
                  </span>
                  {collapsedSections.typography ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>

                {!collapsedSections.typography && (
                  <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Tamanho</span>
                          {renderPropertyActions('fontSize', fontSize)}
                        </div>
                        <input
                          type="text"
                          value={fontSize}
                          placeholder="Padrão"
                          onChange={(e) => {
                            setFontSize(e.target.value);
                            handleStyleChange('fontSize', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Peso (Weight)</span>
                          {renderPropertyActions('fontWeight', fontWeight)}
                        </div>
                        <select
                          value={fontWeight}
                          onChange={(e) => {
                            setFontWeight(e.target.value);
                            handleStyleChange('fontWeight', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none cursor-pointer"
                        >
                          <option value="">Padrão</option>
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semibold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>

                    {/* Line height & letter spacing */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Altura de Linha</span>
                          {renderPropertyActions('lineHeight', lineHeight)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 1.5"
                          value={lineHeight}
                          onChange={(e) => {
                            setLineHeight(e.target.value);
                            handleStyleChange('lineHeight', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Letter Spacing</span>
                          {renderPropertyActions('letterSpacing', letterSpacing)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: -0.02em"
                          value={letterSpacing}
                          onChange={(e) => {
                            setLetterSpacing(e.target.value);
                            handleStyleChange('letterSpacing', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Color */}
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Cor do Texto</span>
                        {renderPropertyActions('color', color)}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={color.startsWith('#') && color.length === 7 ? color : '#ffffff'}
                          onChange={(e) => {
                            setColor(e.target.value);
                            handleStyleChange('color', e.target.value);
                          }}
                          className="w-8 h-8 rounded-lg border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                        />
                        <input
                          type="text"
                          placeholder="Ex: #ffffff"
                          value={color}
                          onChange={(e) => {
                            setColor(e.target.value);
                            handleStyleChange('color', e.target.value);
                          }}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Text Align */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Alinhamento</span>
                      <div className="flex rounded-lg border border-slate-800 overflow-hidden bg-slate-950 w-full">
                        <button
                          onClick={() => handleStyleChange('textAlign', 'left')}
                          className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStyleChange('textAlign', 'center')}
                          className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStyleChange('textAlign', 'right')}
                          className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStyleChange('textAlign', 'justify')}
                          className="flex-1 py-1.5 hover:bg-slate-900 flex justify-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
                       {/* FOLDER 3: Layout */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('layout')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LayoutIcon className="w-3.5 h-3.5 text-slate-400" />
                  Layout
                </span>
                {collapsedSections.layout ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.layout && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Display</span>
                      {renderPropertyActions('display', display)}
                    </div>
                    <select
                      value={display}
                      onChange={(e) => {
                        setDisplay(e.target.value);
                        handleStyleChange('display', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none cursor-pointer"
                    >
                      <option value="">Padrão</option>
                      <option value="block">Block</option>
                      <option value="flex">Flexbox</option>
                      <option value="grid">CSS Grid</option>
                      <option value="inline-block">Inline Block</option>
                      <option value="none">Oculto (None)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 4: Flex / Grid (only shown/active if display flex or grid) */}
            {(display === 'flex' || display === 'grid') && (
              <div className="p-1 animate-slide-up">
                <div 
                  onClick={() => toggleSection('flexGrid')}
                  className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    Flex / Grid
                  </span>
                  {collapsedSections.flexGrid ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>

                {!collapsedSections.flexGrid && (
                  <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                    {display === 'flex' ? (
                      <>
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1 group/field">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Direção</span>
                            <select
                              value={flexDirection}
                              onChange={(e) => {
                                setFlexDirection(e.target.value);
                                handleStyleChange('flexDirection', e.target.value);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="">Row (Padrão)</option>
                              <option value="column">Column</option>
                              <option value="row-reverse">Row Reverse</option>
                              <option value="column-reverse">Column Reverse</option>
                            </select>
                          </div>
                          <div className="space-y-1 group/field">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Espaçamento (Gap)</span>
                            <input
                              type="text"
                              placeholder="Ex: 12px"
                              value={gap}
                              onChange={(e) => {
                                setGap(e.target.value);
                                handleStyleChange('gap', e.target.value);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="space-y-1 group/field">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Alinhamento</span>
                            <select
                              value={alignItems}
                              onChange={(e) => {
                                setAlignItems(e.target.value);
                                handleStyleChange('alignItems', e.target.value);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="">Padrão</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="stretch">Stretch</option>
                            </select>
                          </div>
                          <div className="space-y-1 group/field">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Justificar</span>
                            <select
                              value={justifyContent}
                              onChange={(e) => {
                                setJustifyContent(e.target.value);
                                handleStyleChange('justifyContent', e.target.value);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="">Padrão</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="space-between">Space Between</option>
                              <option value="space-around">Space Around</option>
                            </select>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1 group/field">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Espaçamento (Gap)</span>
                        <input
                          type="text"
                          placeholder="Ex: 16px"
                          value={gap}
                          onChange={(e) => {
                            setGap(e.target.value);
                            handleStyleChange('gap', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FOLDER 5: Spacing (Margin & Padding) */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('spacing')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  Spacing
                </span>
                {collapsedSections.spacing ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.spacing && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Padding</span>
                      {renderPropertyActions('padding', padding)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: 16px ou 12px 24px"
                      value={padding}
                      onChange={(e) => {
                        setPadding(e.target.value);
                        handleStyleChange('padding', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Sup</span>
                          {renderPropertyActions('marginTop', marginTop)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 12px"
                          value={marginTop}
                          onChange={(e) => {
                            setMarginTop(e.target.value);
                            handleStyleChange('marginTop', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Inf</span>
                          {renderPropertyActions('marginBottom', marginBottom)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 12px"
                          value={marginBottom}
                          onChange={(e) => {
                            setMarginBottom(e.target.value);
                            handleStyleChange('marginBottom', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Esq</span>
                          {renderPropertyActions('marginLeft', marginLeft)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: auto"
                          value={marginLeft}
                          onChange={(e) => {
                            setMarginLeft(e.target.value);
                            handleStyleChange('marginLeft', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Dir</span>
                          {renderPropertyActions('marginRight', marginRight)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: auto"
                          value={marginRight}
                          onChange={(e) => {
                            setMarginRight(e.target.value);
                            handleStyleChange('marginRight', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 6: Dimensões */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('dimensions')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                  Dimensões
                </span>
                {collapsedSections.dimensions ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.dimensions && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Largura</span>
                        {renderPropertyActions('width', width)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 100%"
                        value={width}
                        onChange={(e) => {
                          setWidth(e.target.value);
                          handleStyleChange('width', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Altura</span>
                        {renderPropertyActions('height', height)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: auto"
                        value={height}
                        onChange={(e) => {
                          setHeight(e.target.value);
                          handleStyleChange('height', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Max Largura</span>
                        {renderPropertyActions('maxWidth', maxWidth)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 100%"
                        value={maxWidth}
                        onChange={(e) => {
                          setMaxWidth(e.target.value);
                          handleStyleChange('maxWidth', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Max Altura</span>
                        {renderPropertyActions('maxHeight', maxHeight)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: auto"
                        value={maxHeight}
                        onChange={(e) => {
                          setMaxHeight(e.target.value);
                          handleStyleChange('maxHeight', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 7: Posicionamento */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('positioning')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LayoutIcon className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                  Posicionamento
                </span>
                {collapsedSections.positioning ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.positioning && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Posição</span>
                      {renderPropertyActions('position', position)}
                    </div>
                    <select
                      value={position}
                      onChange={(e) => {
                        setPosition(e.target.value);
                        handleStyleChange('position', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="">Static (Padrão)</option>
                      <option value="relative">Relative</option>
                      <option value="absolute">Absolute</option>
                      <option value="fixed">Fixed</option>
                      <option value="sticky">Sticky</option>
                    </select>
                  </div>

                  {position && position !== 'static' && (
                    <div className="space-y-2 animate-slide-up">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1 group/field">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Topo (Top)</span>
                            {renderPropertyActions('top', top)}
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: 0px"
                            value={top}
                            onChange={(e) => {
                              setTop(e.target.value);
                              handleStyleChange('top', e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 group/field">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Fundo (Bottom)</span>
                            {renderPropertyActions('bottom', bottom)}
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: auto"
                            value={bottom}
                            onChange={(e) => {
                              setBottom(e.target.value);
                              handleStyleChange('bottom', e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1 group/field">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Esquerda (Left)</span>
                            {renderPropertyActions('left', left)}
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: 0px"
                            value={left}
                            onChange={(e) => {
                              setLeft(e.target.value);
                              handleStyleChange('left', e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 group/field">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Direita (Right)</span>
                            {renderPropertyActions('right', right)}
                          </div>
                          <input
                            type="text"
                            placeholder="Ex: auto"
                            value={right}
                            onChange={(e) => {
                              setRight(e.target.value);
                              handleStyleChange('right', e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Z-Index</span>
                          {renderPropertyActions('zIndex', zIndex)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: 10"
                          value={zIndex}
                          onChange={(e) => {
                            setZIndex(e.target.value);
                            handleStyleChange('zIndex', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOLDER 8: Background */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('background')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Paintbrush className="w-3.5 h-3.5 text-slate-400" />
                  Background
                </span>
                {collapsedSections.background ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.background && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Cor de Fundo</span>
                      {renderPropertyActions('backgroundColor', bgColor)}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#1f2937'}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          handleStyleChange('backgroundColor', e.target.value);
                        }}
                        className="w-8 h-8 rounded-lg border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                      />
                      <input
                        type="text"
                        placeholder="Ex: transparent"
                        value={bgColor}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          handleStyleChange('backgroundColor', e.target.value);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 9: Borders */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('borders')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400 scale-75" />
                  Borders
                </span>
                {collapsedSections.borders ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.borders && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Espessura</span>
                        {renderPropertyActions('borderWidth', borderWidth)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 1px"
                        value={borderWidth}
                        onChange={(e) => {
                          setBorderWidth(e.target.value);
                          handleStyleChange('borderWidth', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Arredondamento</span>
                        {renderPropertyActions('borderRadius', borderRadius)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: 8px"
                        value={borderRadius}
                        onChange={(e) => {
                          setBorderRadius(e.target.value);
                          handleStyleChange('borderRadius', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Estilo</span>
                        {renderPropertyActions('borderStyle', borderStyle)}
                      </div>
                      <select
                        value={borderStyle}
                        onChange={(e) => {
                          setBorderStyle(e.target.value);
                          handleStyleChange('borderStyle', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="">Padrão</option>
                        <option value="solid">Sólido</option>
                        <option value="dashed">Tracejado</option>
                        <option value="dotted">Pontilhado</option>
                        <option value="none">Sem Borda</option>
                      </select>
                    </div>
                    <div className="space-y-1 group/field">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Cor Borda</span>
                        {renderPropertyActions('borderColor', borderColor)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: #3b82f6"
                        value={borderColor}
                        onChange={(e) => {
                          setBorderColor(e.target.value);
                          handleStyleChange('borderColor', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 10: Effects */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('effects')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                  Effects
                </span>
                {collapsedSections.effects ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.effects && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Opacidade</span>
                      {renderPropertyActions('opacity', opacity)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: 0.8"
                      value={opacity}
                      onChange={(e) => {
                        setOpacity(e.target.value);
                        handleStyleChange('opacity', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Sombra</span>
                      {renderPropertyActions('boxShadow', boxShadow)}
                    </div>
                    <select
                      value={boxShadow}
                      onChange={(e) => {
                        setBoxShadow(e.target.value);
                        handleStyleChange('boxShadow', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="">Nenhuma</option>
                      <option value="rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px">Suave (Soft)</option>
                      <option value="rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px">Médio (Figma)</option>
                      <option value="rgba(0, 0, 0, 0.25) 0px 25px 50px -12px">Forte (High)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 11: Interações */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('interactions')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  Interações
                </span>
                {collapsedSections.interactions ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.interactions && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Cursor</span>
                      {renderPropertyActions('cursor', cursor)}
                    </div>
                    <select
                      value={cursor}
                      onChange={(e) => {
                        setCursor(e.target.value);
                        handleStyleChange('cursor', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="">Padrão</option>
                      <option value="default">Default</option>
                      <option value="pointer">Pointer (Mãozinha)</option>
                      <option value="text">Text (Texto)</option>
                      <option value="move">Move (Mover)</option>
                      <option value="not-allowed">Not Allowed</option>
                    </select>
                  </div>

                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Transição</span>
                      {renderPropertyActions('transition', transition)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: all 0.2s ease"
                      value={transition}
                      onChange={(e) => {
                        setTransition(e.target.value);
                        handleStyleChange('transition', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Pointer Events</span>
                      {renderPropertyActions('pointerEvents', pointerEvents)}
                    </div>
                    <select
                      value={pointerEvents}
                      onChange={(e) => {
                        setPointerEvents(e.target.value);
                        handleStyleChange('pointerEvents', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none cursor-pointer"
                    >
                      <option value="">Padrão</option>
                      <option value="auto">Auto (Ativado)</option>
                      <option value="none">None (Ignorar cliques)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* FOLDER 12: Atributos HTML */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('htmlAttributes')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  Atributos HTML
                </span>
                {collapsedSections.htmlAttributes ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.htmlAttributes && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">ID do Elemento</span>
                      {renderPropertyActions('id', elementIdAttr)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: header-nav"
                      value={elementIdAttr}
                      onChange={(e) => {
                        setElementIdAttr(e.target.value);
                        handleStyleChange('id', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Título (Tooltip)</span>
                      {renderPropertyActions('title', titleAttr)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Clique para expandir"
                      value={titleAttr}
                      onChange={(e) => {
                        setTitleAttr(e.target.value);
                        handleStyleChange('title', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-350 focus:outline-none"
                    />
                  </div>

                  {tag === 'A' && (
                    <div className="space-y-3.5 animate-slide-up">
                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Link (href)</span>
                          {renderPropertyActions('href', hrefAttr)}
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: https://strat.editor"
                          value={hrefAttr}
                          onChange={(e) => {
                            setHrefAttr(e.target.value);
                            handleStyleChange('href', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 group/field">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Destino (Target)</span>
                          {renderPropertyActions('target', targetAttr)}
                        </div>
                        <select
                          value={targetAttr}
                          onChange={(e) => {
                            setTargetAttr(e.target.value);
                            handleStyleChange('target', e.target.value);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">Mesma Aba (_self)</option>
                          <option value="_blank">Nova Aba (_blank)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOLDER 13: Accessibility */}
            <div className="p-1">
              <div 
                onClick={() => toggleSection('accessibility')}
                className="w-full flex items-center justify-between p-2.5 cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-800/30 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LayoutIcon className="w-3.5 h-3.5 text-slate-400" />
                  Accessibility
                </span>
                {collapsedSections.accessibility ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>

              {!collapsedSections.accessibility && (
                <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5 animate-fade-in">
                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Aria Label</span>
                      {renderPropertyActions('aria-label', ariaLabelAttr)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Fechar modal"
                      value={ariaLabelAttr}
                      onChange={(e) => {
                        setAriaLabelAttr(e.target.value);
                        handleStyleChange('aria-label', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 group/field">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Role Semântico</span>
                      {renderPropertyActions('role', roleAttr)}
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: button"
                      value={roleAttr}
                      onChange={(e) => {
                        setRoleAttr(e.target.value);
                        handleStyleChange('role', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                  {isImg && (
                    <div className="space-y-1 group/field animate-slide-up">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Alt Text</span>
                        {renderPropertyActions('alt', altAttr)}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: Descrição da imagem"
                        value={altAttr}
                        onChange={(e) => {
                          setAltAttr(e.target.value);
                          handleStyleChange('alt', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INSPECT TAB */}
        {activeTab === 'inspect' && (
          <div className="p-4 space-y-4 animate-fade-in">
            {/* HTML Inspector Code Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Código HTML
                </span>
                <button
                  onClick={handleCopyHtml}
                  className="text-slate-450 hover:text-slate-200 flex items-center gap-1.5 text-[9px] font-bold bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors shadow-inner"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              
              <textarea
                readOnly
                value={`<${selectedElement.tagName.toLowerCase()} class="${selectedElement.classes.join(' ')}" style="${
                  Object.entries(selectedElement.style)
                    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
                    .join('; ')
                }">\n  ${selectedElement.text || '...'}\n</${selectedElement.tagName.toLowerCase()}>`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-emerald-400 focus:outline-none min-h-[140px] select-text no-scrollbar"
              />
            </div>

            {/* Computed CSS styles Inspector */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                CSS Computado
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 max-h-[220px] overflow-y-auto font-mono text-[9px] text-slate-350 divide-y divide-slate-850 select-text no-scrollbar">
                {Object.entries(selectedElement.style).length === 0 ? (
                  <p className="text-slate-650 italic p-2 text-center">Nenhum estilo inline configurado.</p>
                ) : (
                  Object.entries(selectedElement.style).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1.5">
                      <span className="text-slate-500">
                        {key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}
                      </span>
                      <span className="text-blue-400 font-semibold">{val}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Element classes */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Classes CSS
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedElement.classes.length === 0 ? (
                  <span className="text-[10px] text-slate-600 italic">Sem classes associadas</span>
                ) : (
                  selectedElement.classes.map(cls => (
                    <span 
                      key={cls}
                      className="text-[9px] font-bold bg-slate-950 border border-slate-800 text-slate-350 px-2 py-0.5 rounded font-mono"
                    >
                      .{cls}
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </aside>
  );
}
