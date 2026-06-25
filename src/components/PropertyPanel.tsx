import { useState, useEffect } from 'react';
import type { SemanticElement } from '../types';
import { 
  Type, 
  Paintbrush, 
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Upload,
  Code,
  Layout as LayoutIcon,
  Sliders,
  Copy,
  Check
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
  const [copied, setCopied] = useState(false);

  // Form states synced with selected element
  const [localText, setLocalText] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [color, setColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [borderRadius, setBorderRadius] = useState('');
  const [marginTop, setMarginTop] = useState('');
  const [marginBottom, setMarginBottom] = useState('');
  const [padding, setPadding] = useState('');
  const [borderWidth, setBorderWidth] = useState('');
  const [borderColor, setBorderColor] = useState('');
  const [borderStyle, setBorderStyle] = useState('');
  const [boxShadow, setBoxShadow] = useState('');
  const [display, setDisplay] = useState('');
  const [lineHeight, setLineHeight] = useState('');
  const [letterSpacing, setLetterSpacing] = useState('');

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
      setPadding(selectedElement.style.padding || '');
      setBorderWidth(selectedElement.style.borderWidth || '');
      setBorderColor(selectedElement.style.borderColor || '');
      setBorderStyle(selectedElement.style.borderStyle || '');
      setBoxShadow(selectedElement.style.boxShadow || '');
      setDisplay(selectedElement.style.display || '');
      setLineHeight(selectedElement.style.lineHeight || '');
      setLetterSpacing(selectedElement.style.letterSpacing || '');
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center select-none h-full shrink-0">
        <Paintbrush className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
        <h3 className="text-slate-400 font-semibold mb-1 text-sm">Nenhum elemento selecionado</h3>
        <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
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
    // Generate simple mock HTML for display
    const classesStr = selectedElement.classes.length > 0 ? ` class="${selectedElement.classes.join(' ')}"` : '';
    const styleEntries = Object.entries(selectedElement.style)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
      .join('; ');
    const styleStr = styleEntries ? ` style="${styleEntries}"` : '';
    const mockHtml = `<${selectedElement.tagName.toLowerCase()}${classesStr}${styleStr} data-editor-id="${selectedElement.id}">\n  ${selectedElement.text || '...'}\n</${selectedElement.tagName.toLowerCase()}>`;
    
    navigator.clipboard.writeText(mockHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImg = selectedElement.tagName.toUpperCase() === 'IMG';

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none shrink-0">
      
      {/* Header and Switch Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/40 p-2 flex gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'design'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Design
        </button>
        <button
          onClick={() => setActiveTab('inspect')}
          className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inspect'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Inspect
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="p-4 space-y-5">
            
            {/* Element Identity Info */}
            <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                {selectedElement.tagName.toLowerCase()}
              </span>
              {selectedElement.classes.length > 0 && (
                <span className="text-[10px] text-blue-400 font-mono truncate max-w-[150px]">
                  .{selectedElement.classes[0]}
                </span>
              )}
            </div>

            {/* Typography Section */}
            {!isImg && (
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/40 pb-1">
                  <Type className="w-3.5 h-3.5" />
                  Tipografia
                </span>

                {/* Text Content */}
                {selectedElement.text !== undefined && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Texto</span>
                    <textarea
                      value={localText}
                      onChange={handleTextChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                    />
                  </div>
                )}

                {/* Font Size & Weight */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Tamanho</span>
                    <input
                      type="text"
                      value={fontSize}
                      placeholder="Padrão"
                      onChange={(e) => {
                        setFontSize(e.target.value);
                        handleStyleChange('fontSize', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Peso (Weight)</span>
                    <select
                      value={fontWeight}
                      onChange={(e) => {
                        setFontWeight(e.target.value);
                        handleStyleChange('fontWeight', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
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

                {/* Line Height & Letter Spacing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Altura de Linha</span>
                    <input
                      type="text"
                      placeholder="Ex: 1.5"
                      value={lineHeight}
                      onChange={(e) => {
                        setLineHeight(e.target.value);
                        handleStyleChange('lineHeight', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Espaçamento</span>
                    <input
                      type="text"
                      placeholder="Ex: -0.02em"
                      value={letterSpacing}
                      onChange={(e) => {
                        setLetterSpacing(e.target.value);
                        handleStyleChange('letterSpacing', e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Font Color */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Cor do Texto</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={color.startsWith('#') && color.length === 7 ? color : '#ffffff'}
                      onChange={(e) => {
                        setColor(e.target.value);
                        handleStyleChange('color', e.target.value);
                      }}
                      className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                    />
                    <input
                      type="text"
                      placeholder="Padrão"
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        handleStyleChange('color', e.target.value);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Alinhamento</span>
                  <div className="flex rounded border border-slate-800 overflow-hidden bg-slate-950 w-full">
                    <button
                      onClick={() => handleStyleChange('textAlign', 'left')}
                      className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-400 hover:text-slate-200"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStyleChange('textAlign', 'center')}
                      className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-400 hover:text-slate-200"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStyleChange('textAlign', 'right')}
                      className="flex-1 py-1.5 hover:bg-slate-900 border-r border-slate-800 flex justify-center text-slate-400 hover:text-slate-200"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStyleChange('textAlign', 'justify')}
                      className="flex-1 py-1.5 hover:bg-slate-900 flex justify-center text-slate-400 hover:text-slate-200"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Spacing & Layout Section */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/40 pb-1">
                <LayoutIcon className="w-3.5 h-3.5" />
                Espaçamento & Layout
              </span>

              {/* Margins */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Superior</span>
                  <input
                    type="text"
                    placeholder="Ex: 16px"
                    value={marginTop}
                    onChange={(e) => {
                      setMarginTop(e.target.value);
                      handleStyleChange('marginTop', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Margem Inferior</span>
                  <input
                    type="text"
                    placeholder="Ex: 16px"
                    value={marginBottom}
                    onChange={(e) => {
                      setMarginBottom(e.target.value);
                      handleStyleChange('marginBottom', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Padding & Display */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Padding Interno</span>
                  <input
                    type="text"
                    placeholder="Ex: 24px"
                    value={padding}
                    onChange={(e) => {
                      setPadding(e.target.value);
                      handleStyleChange('padding', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Display</span>
                  <select
                    value={display}
                    onChange={(e) => {
                      setDisplay(e.target.value);
                      handleStyleChange('display', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">Padrão</option>
                    <option value="block">Block</option>
                    <option value="flex">Flexbox</option>
                    <option value="grid">CSS Grid</option>
                    <option value="inline-block">Inline Block</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Colors & Borders Section */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/40 pb-1">
                <Paintbrush className="w-3.5 h-3.5" />
                Aparência & Bordas
              </span>

              {/* Background Color */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Fundo (Background)</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#1e293b'}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      handleStyleChange('backgroundColor', e.target.value);
                    }}
                    className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                  />
                  <input
                    type="text"
                    placeholder="Transparente"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      handleStyleChange('backgroundColor', e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Border Properties */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Espessura Borda</span>
                  <input
                    type="text"
                    placeholder="Ex: 1px"
                    value={borderWidth}
                    onChange={(e) => {
                      setBorderWidth(e.target.value);
                      handleStyleChange('borderWidth', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Arredondamento</span>
                  <input
                    type="text"
                    placeholder="Ex: 8px"
                    value={borderRadius}
                    onChange={(e) => {
                      setBorderRadius(e.target.value);
                      handleStyleChange('borderRadius', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Border Style & Color */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Estilo Borda</span>
                  <select
                    value={borderStyle}
                    onChange={(e) => {
                      setBorderStyle(e.target.value);
                      handleStyleChange('borderStyle', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="">Padrão</option>
                    <option value="solid">Sólida</option>
                    <option value="dashed">Tracejada</option>
                    <option value="dotted">Pontilhada</option>
                    <option value="none">Sem Borda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Cor Borda</span>
                  <input
                    type="text"
                    placeholder="Ex: #3b82f6"
                    value={borderColor}
                    onChange={(e) => {
                      setBorderColor(e.target.value);
                      handleStyleChange('borderColor', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Shadow & Elevation */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Sombra & Elevação</span>
                <select
                  value={boxShadow}
                  onChange={(e) => {
                    setBoxShadow(e.target.value);
                    handleStyleChange('boxShadow', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">Nenhuma</option>
                  <option value="rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px">Suave (Soft)</option>
                  <option value="rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px">Executiva (Medium)</option>
                  <option value="rgba(0, 0, 0, 0.25) 0px 25px 50px -12px">Forte (High)</option>
                </select>
              </div>
            </div>

            {/* Image replace segment */}
            {isImg && (
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/40 pb-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Mídia & Imagem
                </span>
                <div className="border border-dashed border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-950 hover:bg-slate-900 transition-colors cursor-pointer group relative">
                  <Upload className="w-6 h-6 text-slate-600 group-hover:text-blue-500 mb-1.5" />
                  <span className="text-xs text-slate-400 font-medium">Substituir Imagem</span>
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

        {/* INSPECT TAB */}
        {activeTab === 'inspect' && (
          <div className="p-4 space-y-4">
            
            {/* HTML Inspector Code Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Código HTML
                </span>
                <button
                  onClick={handleCopyHtml}
                  className="text-slate-500 hover:text-slate-300 flex items-center gap-1 text-[10px] bg-slate-950 border border-slate-800 px-2 py-1 rounded cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              
              <textarea
                readOnly
                value={`<${selectedElement.tagName.toLowerCase()} class="${selectedElement.classes.join(' ')}" style="${
                  Object.entries(selectedElement.style)
                    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`)
                    .join('; ')
                }">\n  ${selectedElement.text || '...'}\n</${selectedElement.tagName.toLowerCase()}>`}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[10px] text-emerald-400 focus:outline-none min-h-[140px] select-text"
              />
            </div>

            {/* Computed CSS styles Inspector */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                CSS Computado
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 max-h-[220px] overflow-y-auto font-mono text-[10px] text-slate-300 divide-y divide-slate-800/40 select-text">
                {Object.entries(selectedElement.style).length === 0 ? (
                  <p className="text-slate-600 italic p-2 text-center">Nenhum estilo inline configurado.</p>
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
                      className="text-[9px] font-bold bg-slate-800 border border-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded font-mono"
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
