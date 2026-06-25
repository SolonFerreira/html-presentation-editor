import type { SemanticElement } from '../types';

export interface ValidationAlert {
  id: string;
  elementId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  category: 'Acessibilidade' | 'Semântica' | 'Layout' | 'Código';
  elementName: string;
}

export function runHtmlValidation(
  semanticTree: SemanticElement[],
  htmlContent: string
): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];
  
  // 1. Check for parser error (HTML inválido / tags mal fechadas)
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    alerts.push({
      id: 'val-parser-error',
      elementId: 'root',
      type: 'error',
      message: `HTML inválido encontrado pelo navegador: ${parserError.textContent?.substring(0, 80) || ''}...`,
      category: 'Código',
      elementName: 'Documento'
    });
  }

  // Duplicate IDs tracker
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  // Heading hierarchy tracker
  let lastHeadingLevel = 0;

  const traverse = (node: SemanticElement) => {
    // 2. Check duplicate IDs
    const domId = node.attributes?.id;
    if (domId) {
      if (seenIds.has(domId)) {
        duplicateIds.add(domId);
      } else {
        seenIds.add(domId);
      }
    }

    // 3. Accessibility checks
    const tag = node.tagName.toLowerCase();
    
    // Alt text on images
    if (tag === 'img') {
      const alt = node.attributes?.alt;
      const role = node.attributes?.role;
      if (alt === undefined && role !== 'presentation') {
        alerts.push({
          id: `val-alt-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: 'Imagem sem atributo "alt" para leitores de tela.',
          category: 'Acessibilidade',
          elementName: node.humanName
        });
      } else if (alt === '') {
        alerts.push({
          id: `val-alt-empty-${node.id}`,
          elementId: node.id,
          type: 'info',
          message: 'Imagem com "alt" vazio (tratada como decorativa).',
          category: 'Acessibilidade',
          elementName: node.humanName
        });
      }
    }

    // Empty links
    if (tag === 'a') {
      const href = node.attributes?.href;
      const hasText = node.text && node.text.trim().length > 0;
      const hasChildren = node.children && node.children.length > 0;
      
      if (!href || href === '#' || href === '') {
        alerts.push({
          id: `val-href-empty-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: 'Link sem destino definido (href vazio ou "#").',
          category: 'Acessibilidade',
          elementName: node.humanName
        });
      }
      if (!hasText && !hasChildren) {
        alerts.push({
          id: `val-link-empty-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: 'Link totalmente vazio (sem texto ou ícone interno).',
          category: 'Código',
          elementName: node.humanName
        });
      }
    }

    // Heading hierarchy
    const headingMatch = tag.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        alerts.push({
          id: `val-heading-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: `Estrutura de títulos inconsistente: H${level} após H${lastHeadingLevel} (pulo de nível).`,
          category: 'Semântica',
          elementName: node.humanName
        });
      }
      lastHeadingLevel = level;
    }

    // 4. Styles validation / contrast check
    const color = node.style?.color;
    const bg = node.style?.backgroundColor || node.style?.background;
    if (color && bg) {
      const contrast = computeContrastRatio(color, bg);
      if (contrast !== null && contrast < 4.5) {
        alerts.push({
          id: `val-contrast-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: `Contraste baixo de texto (${contrast.toFixed(1)}:1). Recomendado no mínimo 4.5:1.`,
          category: 'Acessibilidade',
          elementName: node.humanName
        });
      }
    }

    // Layout overflow / bad sizing
    const width = node.style?.width;
    if (width && (width.includes('vw') || width.includes('%'))) {
      const val = parseFloat(width);
      if (val > 100) {
        alerts.push({
          id: `val-width-${node.id}`,
          elementId: node.id,
          type: 'warning',
          message: `Largura ultrapassa limites da tela (${width}), podendo causar barra de rolagem horizontal.`,
          category: 'Layout',
          elementName: node.humanName
        });
      }
    }

    // Invisible elements check
    const display = node.style?.display;
    const opacity = node.style?.opacity;
    if (display === 'none' && !node.isHidden) {
      alerts.push({
        id: `val-disp-none-${node.id}`,
        elementId: node.id,
        type: 'info',
        message: 'Elemento com display:none (oculto nativamente no CSS).',
        category: 'Layout',
        elementName: node.humanName
      });
    }
    if (opacity === '0') {
      alerts.push({
        id: `val-opac-0-${node.id}`,
        elementId: node.id,
        type: 'info',
        message: 'Elemento com opacidade zero (invisível na tela).',
        category: 'Layout',
        elementName: node.humanName
      });
    }

    // Dangerous attributes check
    const attrs = node.attributes;
    if (attrs) {
      Object.keys(attrs).forEach(attr => {
        if (attr.startsWith('on') || attr.toLowerCase() === 'onclick' || attr.toLowerCase() === 'onload') {
          alerts.push({
            id: `val-attr-on-${node.id}-${attr}`,
            elementId: node.id,
            type: 'warning',
            message: `Atributo de evento inline detectado: "${attr}". Recomendável evitar scripts inline.`,
            category: 'Código',
            elementName: node.humanName
          });
        }
        const val = attrs[attr];
        if (val && val.toLowerCase().includes('javascript:')) {
          alerts.push({
            id: `val-attr-js-${node.id}-${attr}`,
            elementId: node.id,
            type: 'warning',
            message: `Expressão "javascript:" inline no atributo "${attr}". Risco de segurança.`,
            category: 'Código',
            elementName: node.humanName
          });
        }
      });
    }

    node.children.forEach(traverse);
  };

  semanticTree.forEach(traverse);

  // Add duplicate ID alerts
  duplicateIds.forEach(id => {
    alerts.push({
      id: `val-dup-id-${id}`,
      elementId: 'root',
      type: 'error',
      message: `ID duplicado detectado no documento: "#${id}". Os IDs do DOM devem ser únicos.`,
      category: 'Código',
      elementName: 'Documento'
    });
  });

  return alerts;
}

// Simple color parser to calculate WCAG contrast
function computeContrastRatio(c1: string, c2: string): number | null {
  const r1 = parseToRgb(c1);
  const r2 = parseToRgb(c2);
  if (!r1 || !r2) return null;
  const l1 = getLuminance(r1.r, r1.g, r1.b);
  const l2 = getLuminance(r2.r, r2.g, r2.b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseToRgb(colorStr: string): { r: number; g: number; b: number } | null {
  const s = colorStr.trim().toLowerCase();
  if (s.startsWith('#')) {
    let hex = s.substring(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
  } else if (s.startsWith('rgb')) {
    const match = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
  }
  // Named colors quick defaults
  const named: Record<string, string> = {
    white: '#ffffff', black: '#000000', red: '#ff0000', green: '#00ff00', blue: '#0000ff'
  };
  if (named[s]) return parseToRgb(named[s]);
  return null;
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
