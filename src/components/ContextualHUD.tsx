import { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  CornerUpLeft, 
  FolderMinus, 
  Box, 
  Layers, 
  Eraser, 
  Trash2, 
  Copy, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Link,
  ChevronDown,
  Settings,
  Palette,
  Image as ImageIcon
} from 'lucide-react';

interface ContextualHUDProps {
  tagName: string;
  style: Record<string, string>;
  attributes: Record<string, string>;
  onUpdateStyles: (styles: Record<string, string>) => void;
  onUnwrap: () => void;
  onWrap: (tag: 'div' | 'section') => void;
  onChangeTag: (newTag: string) => void;
  onClearStyles: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onMoveOut: () => void;
  onGroup: () => void;
  hasParent: boolean;
}

export function ContextualHUD({
  tagName,
  style,
  attributes,
  onUpdateStyles,
  onUnwrap,
  onWrap,
  onChangeTag,
  onClearStyles,
  onDuplicate,
  onDelete,
  onMove,
  onMoveOut,
  onGroup,
  hasParent
}: ContextualHUDProps) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
  const tagMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showTagMenu && tagMenuRef.current && !tagMenuRef.current.contains(target)) {
        setShowTagMenu(false);
      }
      if (showActionsMenu && actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setShowActionsMenu(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showTagMenu, showActionsMenu]);

  const tagLower = tagName.toLowerCase();
  const isText = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li'].includes(tagLower);
  const isImage = tagLower === 'img';
  const isContainer = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main'].includes(tagLower);
  const isLink = tagLower === 'a';

  // Read current color value (default to white/empty for visual picker)
  const textColor = style.color || '#ffffff';
  const bgColor = style.backgroundColor || style.background || '#ffffff';

  // Parse font size to change
  const handleFontSizeChange = (dir: 'up' | 'down') => {
    const currentSize = style.fontSize || '16px';
    const val = parseFloat(currentSize) || 16;
    const unit = currentSize.replace(/[\d.]/g, '') || 'px';
    const step = val >= 32 ? 4 : 2;
    const newSize = dir === 'up' ? val + step : Math.max(8, val - step);
    onUpdateStyles({ fontSize: `${newSize}${unit}` });
  };

  // Preset paddings for containers
  const handleSpacingChange = (preset: 'compact' | 'medium' | 'spacious') => {
    const paddingMap = {
      compact: '8px 12px',
      medium: '16px 24px',
      spacious: '32px 48px'
    };
    onUpdateStyles({ padding: paddingMap[preset] });
  };

  const commonTagOptions = ['div', 'section', 'h1', 'h2', 'h3', 'p', 'button', 'a'];

  return (
    <div className="flex items-center bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg shadow-premium p-1 gap-1 text-slate-300 font-sans text-xs select-none">
      
      {/* 1. TAG DISPLAY & SELECTOR */}
      <div className="relative" ref={tagMenuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTagMenu(!showTagMenu);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 font-mono text-[10px] text-blue-400 font-bold bg-slate-950 border border-slate-805 cursor-pointer"
        >
          &lt;{tagLower}&gt;
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {showTagMenu && (
          <div className="absolute left-0 bottom-full mb-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-2xl z-50 w-28 flex flex-col gap-0.5">
            <span className="px-2 py-0.5 text-[8px] text-slate-500 font-bold uppercase tracking-wider">Trocar Tag</span>
            {commonTagOptions.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  onChangeTag(opt);
                  setShowTagMenu(false);
                }}
                className={`text-left px-2 py-1 rounded text-xs hover:bg-slate-800 font-mono cursor-pointer ${
                  tagLower === opt ? 'text-blue-400 font-bold' : 'text-slate-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

      {/* 2. TEXT CONTROLS */}
      {isText && (
        <div className="flex items-center gap-0.5">
          {/* FontSize adjust */}
          <button
            onClick={() => handleFontSizeChange('down')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-850 hover:text-white cursor-pointer font-bold"
            title="Diminuir Fonte"
          >
            A-
          </button>
          <button
            onClick={() => handleFontSizeChange('up')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-850 hover:text-white cursor-pointer font-bold"
            title="Aumentar Fonte"
          >
            A+
          </button>

          <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

          {/* Color picker */}
          <div className="flex items-center gap-1.5 px-1.5" title="Cor do Texto">
            <input 
              type="color"
              value={textColor.startsWith('#') && textColor.length === 7 ? textColor : '#ffffff'}
              onChange={(e) => onUpdateStyles({ color: e.target.value })}
              className="w-4 h-4 rounded-sm border-none bg-transparent cursor-pointer overflow-hidden p-0"
            />
          </div>

          <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

          {/* Alignments */}
          <button
            onClick={() => onUpdateStyles({ textAlign: 'left' })}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-850 cursor-pointer ${
              style.textAlign === 'left' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-400'
            }`}
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateStyles({ textAlign: 'center' })}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-850 cursor-pointer ${
              style.textAlign === 'center' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-400'
            }`}
            title="Alinhar ao Centro"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateStyles({ textAlign: 'right' })}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-850 cursor-pointer ${
              style.textAlign === 'right' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-400'
            }`}
            title="Alinhar à Direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          {isLink && (
            <>
              <div className="w-px h-5 bg-slate-800/80 mx-0.5" />
              <div className="flex items-center gap-1 px-1">
                <Link className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="link URL"
                  value={attributes.href || ''}
                  onChange={(e) => onUpdateStyles({ href: e.target.value })}
                  className="bg-slate-950 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded w-24 text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. IMAGE CONTROLS */}
      {isImage && (
        <div className="flex items-center gap-1.5 px-1">
          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="URL da Imagem (src)"
            value={attributes.src || ''}
            onChange={(e) => onUpdateStyles({ src: e.target.value })}
            className="bg-slate-950 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded w-32 text-slate-300 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Texto alt"
            value={attributes.alt || ''}
            onChange={(e) => onUpdateStyles({ alt: e.target.value })}
            className="bg-slate-950 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded w-24 text-slate-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* 4. CONTAINER CONTROLS */}
      {isContainer && (
        <div className="flex items-center gap-1">
          {/* Spacing presets */}
          <div className="flex bg-slate-950 border border-slate-805 rounded p-0.5">
            <button
              onClick={() => handleSpacingChange('compact')}
              className="px-1.5 py-0.5 text-[8px] font-bold rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              title="Espaçamento Compacto"
            >
              P
            </button>
            <button
              onClick={() => handleSpacingChange('medium')}
              className="px-1.5 py-0.5 text-[8px] font-bold rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              title="Espaçamento Médio"
            >
              M
            </button>
            <button
              onClick={() => handleSpacingChange('spacious')}
              className="px-1.5 py-0.5 text-[8px] font-bold rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              title="Espaçamento Largo"
            >
              G
            </button>
          </div>

          <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

          {/* Background color picker */}
          <div className="flex items-center gap-1.5 px-1.5" title="Cor de Fundo">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <input 
              type="color"
              value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff'}
              onChange={(e) => onUpdateStyles({ backgroundColor: e.target.value })}
              className="w-4 h-4 rounded-sm border-none bg-transparent cursor-pointer overflow-hidden p-0"
            />
          </div>

          <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

          {/* Display fast switches */}
          <button
            onClick={() => onUpdateStyles({ display: 'flex', flexDirection: 'column' })}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded hover:bg-slate-850 cursor-pointer ${
              style.display === 'flex' && style.flexDirection === 'column' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-500'
            }`}
            title="Empilhamento Vertical (Flex Col)"
          >
            Col
          </button>
          <button
            onClick={() => onUpdateStyles({ display: 'flex', flexDirection: 'row' })}
            className={`px-1.5 py-0.5 text-[9px] font-mono rounded hover:bg-slate-850 cursor-pointer ${
              style.display === 'flex' && (style.flexDirection === 'row' || !style.flexDirection) ? 'text-blue-400 bg-slate-800/50' : 'text-slate-500'
            }`}
            title="Lado a Lado (Flex Row)"
          >
            Row
          </button>
        </div>
      )}

      <div className="w-px h-5 bg-slate-800/80 mx-0.5" />

      {/* 5. DOM STRUCTURAL ACTIONS DROPDOWN */}
      <div className="relative" ref={actionsMenuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActionsMenu(!showActionsMenu);
          }}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          title="Ações Estruturais"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {showActionsMenu && (
          <div className="absolute right-0 bottom-full mb-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1.5 shadow-2xl z-50 w-44 flex flex-col gap-0.5">
            <span className="px-2 py-0.5 text-[8px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800/80 mb-1">
              Operações
            </span>
            
            <button
              onClick={() => { onDuplicate(); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-3 h-3" /> Duplicar elemento
            </button>

            <button
              onClick={() => { onMove('up'); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <ArrowUp className="w-3 h-3" /> Mover para Cima
            </button>
            <button
              onClick={() => { onMove('down'); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <ArrowDown className="w-3 h-3" /> Mover para Baixo
            </button>

            {hasParent && (
              <button
                onClick={() => { onMoveOut(); setShowActionsMenu(false); }}
                className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <CornerUpLeft className="w-3 h-3" /> Mover para Fora
              </button>
            )}

            <div className="h-px bg-slate-800 my-1" />

            <button
              onClick={() => { onGroup(); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Box className="w-3 h-3" /> Agrupar (Container)
            </button>

            <button
              onClick={() => { onWrap('div'); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Box className="w-3 h-3" /> Envolver em &lt;div&gt;
            </button>

            <button
              onClick={() => { onWrap('section'); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-3 h-3" /> Envolver em &lt;section&gt;
            </button>

            <button
              onClick={() => { onUnwrap(); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <FolderMinus className="w-3 h-3" /> Desagrupar (Unwrap)
            </button>

            <button
              onClick={() => { onClearStyles(); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-slate-800 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <Eraser className="w-3 h-3" /> Limpar Estilos Inline
            </button>

            <div className="h-px bg-slate-800/80 my-1" />

            <button
              onClick={() => { onDelete(); setShowActionsMenu(false); }}
              className="text-left px-2 py-1 rounded text-xs hover:bg-red-950/40 text-red-400 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-500" /> Excluir
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
