// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { runHtmlValidation } from './validation';
import type { SemanticElement } from '../types';

describe('runHtmlValidation', () => {
  it('should detect parser error for malformed HTML', () => {
    // Note: in JSdom DOMParser might not generate parsererror for all things, but if it does, it should be detected.
    const invalidHtml = '<div data-editor-id="el-1"><p>unclosed tag</div';
    const tree: SemanticElement[] = [
      {
        id: 'el-1',
        tagName: 'DIV',
        role: 'unknown',
        humanName: 'div',
        classes: [],
        style: {},
        attributes: {},
        xpath: '/div',
        children: []
      }
    ];
    const alerts = runHtmlValidation(tree, invalidHtml);
    expect(alerts.some(a => a.id === 'val-parser-error')).toBe(false);
    // Since DOMParser auto-closes standard tags in browser environment, let's check for explicit parser error if injected.
    const parserErrorHtml = '<html><body><parsererror>Erro de sintaxe</parsererror></body></html>';
    const alertsWithError = runHtmlValidation(tree, parserErrorHtml);
    expect(alertsWithError.some(a => a.id === 'val-parser-error')).toBe(true);
  });

  it('should detect duplicate IDs in the document', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-1',
        tagName: 'DIV',
        role: 'unknown',
        humanName: 'div',
        classes: [],
        style: {},
        attributes: { id: 'test-id' },
        xpath: '/div[1]',
        children: [
          {
            id: 'el-2',
            tagName: 'SPAN',
            role: 'unknown',
            humanName: 'span',
            classes: [],
            style: {},
            attributes: { id: 'test-id' }, // Duplicate ID
            xpath: '/div[1]/span[1]',
            children: []
          }
        ]
      }
    ];
    const alerts = runHtmlValidation(tree, '<div><span id="test-id" id="test-id"></span></div>');
    expect(alerts.some(a => a.id === 'val-dup-id-test-id')).toBe(true);
  });

  it('should validate image alt attributes', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-img-1',
        tagName: 'IMG',
        role: 'image',
        humanName: 'img',
        classes: [],
        style: {},
        attributes: {}, // Missing alt entirely
        xpath: '/img[1]',
        children: []
      },
      {
        id: 'el-img-2',
        tagName: 'IMG',
        role: 'image',
        humanName: 'img',
        classes: [],
        style: {},
        attributes: { alt: '' }, // Empty alt
        xpath: '/img[2]',
        children: []
      },
      {
        id: 'el-img-3',
        tagName: 'IMG',
        role: 'image',
        humanName: 'img',
        classes: [],
        style: {},
        attributes: { alt: 'Imagem bonita' }, // Correct alt
        xpath: '/img[3]',
        children: []
      }
    ];

    const alerts = runHtmlValidation(tree, '<div><img /><img alt="" /><img alt="Imagem bonita" /></div>');
    
    // Missing alt warning
    expect(alerts.some(a => a.id === 'val-alt-el-img-1' && a.type === 'warning')).toBe(true);
    // Empty alt info
    expect(alerts.some(a => a.id === 'val-alt-empty-el-img-2' && a.type === 'info')).toBe(true);
    // Correct alt should have no alerts
    expect(alerts.some(a => a.elementId === 'el-img-3')).toBe(false);
  });

  it('should validate empty links and missing href', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-link-1',
        tagName: 'A',
        role: 'button',
        humanName: 'link',
        classes: [],
        style: {},
        attributes: { href: '#' }, // Dummy href
        text: 'Clique aqui',
        xpath: '/a[1]',
        children: []
      },
      {
        id: 'el-link-2',
        tagName: 'A',
        role: 'button',
        humanName: 'link',
        classes: [],
        style: {},
        attributes: { href: '/home' }, // Valid href but completely empty text and children
        text: '',
        xpath: '/a[2]',
        children: []
      }
    ];

    const alerts = runHtmlValidation(tree, '<a href="#">Clique aqui</a><a href="/home"></a>');
    
    // Link 1 should warn about # href
    expect(alerts.some(a => a.id === 'val-href-empty-el-link-1' && a.type === 'warning')).toBe(true);
    // Link 2 should warn about empty content
    expect(alerts.some(a => a.id === 'val-link-empty-el-link-2' && a.type === 'warning')).toBe(true);
  });

  it('should detect headings hierarchy inconsistency', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-h1',
        tagName: 'H1',
        role: 'title',
        humanName: 'Título H1',
        classes: [],
        style: {},
        attributes: {},
        xpath: '/h1',
        children: []
      },
      {
        id: 'el-h3',
        tagName: 'H3',
        role: 'title',
        humanName: 'Título H3', // Jump from H1 to H3
        classes: [],
        style: {},
        attributes: {},
        xpath: '/h3',
        children: []
      }
    ];

    const alerts = runHtmlValidation(tree, '<h1>Titulo</h1><h3>Subtitulo</h3>');
    expect(alerts.some(a => a.id === 'val-heading-el-h3' && a.type === 'warning')).toBe(true);
  });

  it('should calculate color contrast ratios and alert low contrast', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-contrast-low',
        tagName: 'DIV',
        role: 'text',
        humanName: 'Texto Claro no Fundo Claro',
        classes: [],
        style: { color: '#888888', backgroundColor: '#ffffff' }, // Low contrast
        attributes: {},
        xpath: '/div[1]',
        children: []
      },
      {
        id: 'el-contrast-high',
        tagName: 'DIV',
        role: 'text',
        humanName: 'Texto Escuro no Fundo Claro',
        classes: [],
        style: { color: '#000000', backgroundColor: '#ffffff' }, // Good contrast
        attributes: {},
        xpath: '/div[2]',
        children: []
      }
    ];

    const alerts = runHtmlValidation(tree, '<div>Texto</div><div>Texto</div>');
    expect(alerts.some(a => a.id === 'val-contrast-el-contrast-low')).toBe(true);
    expect(alerts.some(a => a.id === 'val-contrast-el-contrast-high')).toBe(false);
  });

  it('should warn about inline event handlers and javascript: URIs', () => {
    const tree: SemanticElement[] = [
      {
        id: 'el-script-1',
        tagName: 'BUTTON',
        role: 'button',
        humanName: 'botão perigoso',
        classes: [],
        style: {},
        attributes: { onclick: 'alert(1)' },
        xpath: '/button',
        children: []
      },
      {
        id: 'el-script-2',
        tagName: 'A',
        role: 'button',
        humanName: 'link javascript',
        classes: [],
        style: {},
        attributes: { href: 'javascript:void(0)' },
        xpath: '/a',
        children: []
      }
    ];

    const alerts = runHtmlValidation(tree, '<button onclick="alert(1)">Clique</button><a href="javascript:void(0)">Link</a>');
    
    // onclick inline detection
    expect(alerts.some(a => a.id.startsWith('val-attr-on-el-script-1'))).toBe(true);
    // javascript: href detection
    expect(alerts.some(a => a.id.startsWith('val-attr-js-el-script-2'))).toBe(true);
  });
});
