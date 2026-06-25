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
  Upload
} from 'lucide-react';

interface PropertyPanelProps {
  selectedElement: SemanticElement | null;
  onUpdateStyles: (elementId: string, styles: Record<string, string>) => void;
  onUpdateText: (elementId: string, text: string) => void;
  onUploadImage: (relativePath: string, file: File) => Promise<string | undefined>;
}

export function PropertyPanel({
  selectedElement,
  onUpdateStyles,
  onUpdateText,
  onUploadImage
}: PropertyPanelProps) {
  const [localText, setLocalText] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [color, setColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [borderRadius, setBorderRadius] = useState('');
  const [spacing, setSpacing] = useState('');

  // Sync state when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setLocalText(selectedElement.text || '');
      setFontSize(selectedElement.style.fontSize || '');
      setFontWeight(selectedElement.style.fontWeight || '');
      setColor(selectedElement.style.color || '');
      setBgColor(selectedElement.style.backgroundColor || '');
      setBorderRadius(selectedElement.style.borderRadius || '');
      setSpacing(selectedElement.style.marginTop || selectedElement.style.margin || '');
    } else {
      setLocalText('');
      setFontSize('');
      setFontWeight('');
      setColor('');
      setBgColor('');
      setBorderRadius('');
      setSpacing('');
    }
  }, [selectedElement]);

  if (!selectedElement) {
    return (
      <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center select-none h-full">
        <Paintbrush className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
        <h3 className="text-slate-400 font-medium mb-1">Nenhum elemento selecionado</h3>
        <p className="text-xs text-slate-600 max-w-[200px]">
          Clique em qualquer elemento do slide para ajustar suas propriedades visuais.
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
      // We will save it in a folder called 'images' or in root
      const relativePath = `images/${file.name}`;
      const newBlobUrl = await onUploadImage(relativePath, file);
      if (newBlobUrl) {
        onUpdateStyles(selectedElement.id, { src: relativePath });
      }
    }
  };

  const isImg = selectedElement.tagName.toUpperCase() === 'IMG';

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-blue-500" />
          Propriedades Visuais
        </h2>
        <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
          {selectedElement.tagName}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* TEXT EDITING SECTION */}
        {!isImg && selectedElement.text !== undefined && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Conteúdo do Texto
            </label>
            <textarea
              value={localText}
              onChange={handleTextChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
            />
          </div>
        )}

        {/* IMAGE UPLOAD SECTION */}
        {isImg && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Substituir Imagem
            </label>
            <div className="border-2 border-dashed border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-950 hover:bg-slate-900 transition-colors cursor-pointer group relative">
              <Upload className="w-8 h-8 text-slate-600 group-hover:text-blue-500 transition-colors mb-2" />
              <span className="text-xs text-slate-400 font-medium">Carregar imagem local</span>
              <span className="text-[10px] text-slate-600 mt-1">PNG, JPG, SVG ou WebP</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TYPOGRAPHY SECTION */}
        {!isImg && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/50 pb-1.5">
              Tipografia
            </h3>
            
            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Tamanho</span>
                <select
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    handleStyleChange('fontSize', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">Padrão</option>
                  <option value="12px">12px (Muito Pequeno)</option>
                  <option value="14px">14px (Pequeno)</option>
                  <option value="16px">16px (Normal)</option>
                  <option value="20px">20px (Destaque)</option>
                  <option value="24px">24px (Subtítulo)</option>
                  <option value="32px">32px (Título Médio)</option>
                  <option value="40px">40px (Título Grande)</option>
                  <option value="48px">48px (Hero)</option>
                  <option value="64px">64px (Gigante)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Espessura</span>
                <select
                  value={fontWeight}
                  onChange={(e) => {
                    setFontWeight(e.target.value);
                    handleStyleChange('fontWeight', e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">Padrão</option>
                  <option value="300">300 (Leve)</option>
                  <option value="400">400 (Regular)</option>
                  <option value="500">500 (Médio)</option>
                  <option value="600">600 (Semibold)</option>
                  <option value="700">700 (Negrito)</option>
                  <option value="800">800 (Extra Bold)</option>
                  <option value="900">900 (Preto)</option>
                </select>
              </div>
            </div>

            {/* Font Color */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Cor do Texto</span>
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
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Alinhamento</span>
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

        {/* CONTAINER & STYLING SECTION */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/50 pb-1.5">
            Aparência & Container
          </h3>

          {/* Background Color */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Cor do Fundo</span>
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

          {/* Spacing / Margin-Top */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Espaçamento Superior</span>
              <span className="text-[10px] text-slate-400">{spacing || 'Padrão'}</span>
            </div>
            <select
              value={spacing.includes('px') ? spacing : ''}
              onChange={(e) => {
                setSpacing(e.target.value);
                handleStyleChange('marginTop', e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">Padrão</option>
              <option value="0px">Sem Espaço (0px)</option>
              <option value="8px">Estreito (8px)</option>
              <option value="16px">Normal (16px)</option>
              <option value="24px">Moderado (24px)</option>
              <option value="32px">Largo (32px)</option>
              <option value="48px">Muito Largo (48px)</option>
              <option value="64px">Máximo (64px)</option>
            </select>
          </div>

          {/* Border Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Arredondamento</span>
              <span className="text-[10px] text-slate-400">{borderRadius || 'Padrão'}</span>
            </div>
            <select
              value={borderRadius}
              onChange={(e) => {
                setBorderRadius(e.target.value);
                handleStyleChange('borderRadius', e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">Padrão</option>
              <option value="0px">Quadrado (0px)</option>
              <option value="4px">Suave (4px)</option>
              <option value="8px">Médio (8px)</option>
              <option value="12px">Forte (12px)</option>
              <option value="20px">Circular (20px)</option>
              <option value="9999px">Pílula (9999px)</option>
            </select>
          </div>

        </div>
      </div>
    </aside>
  );
}
