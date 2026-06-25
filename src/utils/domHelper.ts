import type { FileItem, SemanticElement, SemanticRole } from '../types';

/**
 * Injects temporary `data-editor-id` attributes to all elements in the HTML body
 */
export function injectEditorIds(htmlContent: string, startId = 1): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  let idCounter = startId;
  const traverse = (element: Element) => {
    // Only assign editor IDs to elements inside body and skip script/style tags
    if (element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE' && element.tagName !== 'HEAD' && element.tagName !== 'HTML') {
      element.setAttribute('data-editor-id', `el-${idCounter++}`);
    }
    Array.from(element.children).forEach(traverse);
  };

  if (doc.body) {
    traverse(doc.body);
  }
  
  return doc.documentElement.outerHTML;
}

/**
 * Scans the HTML content for the maximum editor ID and returns the number.
 */
export function getMaxEditorId(htmlContent: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  let max = 0;
  
  const scan = (element: Element) => {
    const editorId = element.getAttribute('data-editor-id');
    if (editorId) {
      const match = editorId.match(/^el-(\d+)$/);
      if (match) {
        const idNum = parseInt(match[1], 10);
        if (idNum > max) {
          max = idNum;
        }
      }
    }
    Array.from(element.children).forEach(scan);
  };

  if (doc.body) {
    scan(doc.body);
  }

  return max;
}

/**
 * Removes all temporary `data-editor-id` attributes from the HTML content
 */
export function stripEditorIds(htmlContent: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const removeIds = (element: Element) => {
    element.removeAttribute('data-editor-id');
    Array.from(element.children).forEach(removeIds);
  };

  if (doc.body) {
    removeIds(doc.body);
  }

  return doc.documentElement.outerHTML;
}

/**
 * Helper to determine semantic role based on tag, classes, and attributes
 */
function getSemanticRole(element: Element): SemanticRole {
  const tagName = element.tagName.toUpperCase();
  const classes = Array.from(element.classList).join(' ').toLowerCase();
  const id = (element.getAttribute('id') || '').toLowerCase();
  const roleAttr = (element.getAttribute('role') || '').toLowerCase();

  if (tagName === 'BODY') return 'slide';
  
  // Navigation / Header
  if (tagName === 'NAV' || roleAttr === 'navigation' || classes.includes('nav') || classes.includes('menu') || classes.includes('navbar') || id.includes('nav')) {
    return 'navbar';
  }
  
  // Footer
  if (tagName === 'FOOTER' || classes.includes('footer') || id.includes('footer')) {
    return 'footer';
  }

  // Hero Section
  if (classes.includes('hero') || classes.includes('banner') || classes.includes('jumbotron') || classes.includes('splash') || id.includes('hero')) {
    return 'hero';
  }

  // CTA Section
  if (classes.includes('cta') || classes.includes('call-to-action') || id.includes('cta')) {
    return 'cta';
  }

  // Pricing
  if (classes.includes('pricing') || classes.includes('pricing-table') || classes.includes('pricing-grid') || id.includes('pricing')) {
    return 'pricing';
  }

  // FAQ Accordion
  if (classes.includes('faq') || classes.includes('accordion') || classes.includes('questions') || id.includes('faq')) {
    return 'faq';
  }

  // Testimonial
  if (tagName === 'BLOCKQUOTE' || classes.includes('testimonial') || classes.includes('review') || classes.includes('quote') || id.includes('testimonial')) {
    return 'testimonial';
  }

  // Tables
  if (tagName === 'TABLE' || tagName === 'TBODY' || tagName === 'THEAD') {
    return 'table';
  }

  // Forms
  if (tagName === 'FORM' || classes.includes('form') || id.includes('form')) {
    return 'form';
  }

  // Sections
  if (tagName === 'SECTION' || classes.includes('section') || id.includes('section')) {
    return 'section';
  }

  // Grids
  if (classes.includes('grid') || classes.includes('metrics-grid') || classes.includes('feature-grid')) {
    return 'grid';
  }

  // Titles
  if (tagName.match(/^H[1-6]$/) || classes.includes('title') || classes.includes('heading') || classes.includes('headline')) {
    return 'title';
  }

  // Images & SVGs
  if (tagName === 'IMG' || tagName === 'SVG' || tagName === 'PICTURE' || classes.includes('image') || classes.includes('logo') || classes.includes('icon')) {
    return 'image';
  }

  // Buttons
  if (tagName === 'BUTTON' || (tagName === 'A' && (classes.includes('btn') || classes.includes('button')))) {
    return 'button';
  }

  // Text
  if (tagName === 'P' || tagName === 'SPAN' || tagName === 'LI' || tagName === 'A' || tagName === 'B' || tagName === 'STRONG' || tagName === 'EM' || tagName === 'SMALL') {
    return 'text';
  }

  // Cards
  if (classes.includes('card') || classes.includes('item') || classes.includes('box') || classes.includes('card-item')) {
    return 'card';
  }

  // Generic Containers
  if (tagName === 'DIV' || tagName === 'MAIN' || tagName === 'ARTICLE' || tagName === 'ASIDE' || tagName === 'HEADER' || classes.includes('container') || classes.includes('wrapper') || classes.includes('content') || classes.includes('inner')) {
    return 'container';
  }

  return 'unknown';
}

/**
 * Contextual renaming heuristic to assign friendly human names
 */
function computeHumanName(
  tag: string,
  role: SemanticRole,
  classes: string[],
  parentRole?: SemanticRole,
  userLabel?: string
): string {
  if (userLabel) return userLabel;

  const tagLower = tag.toLowerCase();

  // Contextual renaming rules
  if (parentRole === 'hero') {
    if (role === 'title') return 'Hero Headline (Título)';
    if (role === 'text') return 'Hero Subtitle (Subtexto)';
    if (role === 'button') return 'Hero CTA (Botão)';
  }
  if (parentRole === 'navbar') {
    if (role === 'button') return 'Menu Button';
    if (tagLower === 'a' || role === 'text') return 'Nav Link (Link Menu)';
    if (role === 'image') return 'Navbar Logo';
  }
  if (parentRole === 'footer') {
    if (tagLower === 'a' || role === 'text') return 'Footer Link';
    if (role === 'image') return 'Footer Logo';
  }
  if (parentRole === 'card') {
    if (role === 'title') return 'Card Title';
    if (role === 'text') return 'Card Description';
    if (role === 'image') return 'Card Thumbnail';
    if (role === 'button') return 'Card Action';
  }
  if (parentRole === 'pricing') {
    if (role === 'title') return 'Plan Name';
    if (role === 'text') return 'Plan Feature';
    if (role === 'button') return 'Select Plan Button';
  }
  if (parentRole === 'faq') {
    if (role === 'title') return 'FAQ Question';
    if (role === 'text') return 'FAQ Answer';
  }
  if (parentRole === 'testimonial') {
    if (role === 'text') return 'Quote Text';
    if (role === 'title') return 'Author Name';
  }
  if (parentRole === 'form') {
    if (tagLower === 'input' || tagLower === 'textarea' || tagLower === 'select') return 'Form Input';
    if (tagLower === 'label') return 'Form Label';
    if (role === 'button') return 'Submit Button';
  }

  // Fallbacks based on role
  if (role === 'hero') return 'Hero Section';
  if (role === 'navbar') return 'Navigation Bar';
  if (role === 'footer') return 'Footer Area';
  if (role === 'pricing') return 'Pricing Section';
  if (role === 'faq') return 'FAQ Accordion';
  if (role === 'testimonial') return 'Testimonial Block';
  if (role === 'cta') return 'CTA Callout';
  if (role === 'card') return 'Metric Card';
  if (role === 'grid') return 'Feature Grid';
  if (role === 'form') return 'Form Group';
  if (role === 'table') return 'Data Table';
  
  if (role === 'title') {
    if (tagLower === 'h1') return 'Main Title (H1)';
    if (tagLower === 'h2') return 'Section Title (H2)';
    return `${tag.toUpperCase()} Title`;
  }
  if (role === 'image') return 'Image Asset';
  if (role === 'button') return 'Button Action';
  if (role === 'text') return 'Paragraph Text';
  if (role === 'section') return 'Section Container';

  // General fallback
  const firstClass = classes.length > 0 ? `.${classes[0]}` : '';
  return `${tagLower}${firstClass}`;
}

/**
 * Generates an XPath-like selector for mapping back to the DOM
 */
function getElementXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }
    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }
  return parts.length ? `/${parts.join('/')}` : '';
}

/**
 * Parses a Document or HTMLElement and builds a Semantic Tree
 */
export function generateSemanticTree(rootElement: Element): SemanticElement[] {
  const tree: SemanticElement[] = [];

  const traverse = (
    element: Element,
    parentList: SemanticElement[],
    parentRole?: SemanticRole,
    parentHumanName?: string
  ) => {
    const editorId = element.getAttribute('data-editor-id');
    if (!editorId) {
      // If no editor ID, just traverse children directly
      Array.from(element.children).forEach(child => traverse(child, parentList, parentRole, parentHumanName));
      return;
    }

    const inlineStyle: Record<string, string> = {};
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      styleAttr.split(';').forEach(pair => {
        const [key, value] = pair.split(':');
        if (key && value) {
          inlineStyle[key.trim()] = value.trim();
        }
      });
    }

    // Capture text content if it's short and element has no children
    let text: string | undefined;
    if (element.children.length === 0 && element.textContent) {
      text = element.textContent.trim().substring(0, 100);
    }

    const capturedAttributes: Record<string, string> = {};
    const attrsToCapture = ['id', 'title', 'href', 'target', 'alt', 'role', 'aria-label'];
    attrsToCapture.forEach(attrName => {
      const val = element.getAttribute(attrName);
      if (val !== null && attrName !== 'data-editor-id') {
        capturedAttributes[attrName] = val;
      }
    });

    const userLabel = element.getAttribute('data-editor-label') || undefined;
    const role = getSemanticRole(element);
    const humanName = computeHumanName(element.tagName, role, Array.from(element.classList), parentRole, userLabel);

    const node: SemanticElement = {
      id: editorId,
      tagName: element.tagName,
      role,
      humanName,
      text,
      classes: Array.from(element.classList),
      style: inlineStyle,
      attributes: capturedAttributes,
      children: [],
      xpath: getElementXPath(element),
      isLocked: element.getAttribute('data-editor-locked') === 'true',
      isHidden: element.getAttribute('data-editor-hidden') === 'true',
      label: userLabel,
      outerHTML: element.outerHTML
    };

    parentList.push(node);
    Array.from(element.children).forEach(child => traverse(child, node.children, role, humanName));
  };

  traverse(rootElement, tree);
  return tree;
}

/**
 * Prepares the HTML content for safe sandbox preview inside the iframe.
 * Inlines CSS, replaces images with blob URLs, and injects styling overrides.
 */
export function prepareHtmlForPreview(
  htmlContent: string,
  filesMap: Record<string, FileItem>
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // 1. Inline CSS stylesheets
  const linkStylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
  linkStylesheets.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      // Find stylesheet in loaded files
      const cleanHref = href.replace(/^\.\//, ''); // Clean leading './'
      const cssFile = filesMap[cleanHref];
      if (cssFile && cssFile.content) {
        const styleTag = doc.createElement('style');
        styleTag.textContent = cssFile.content;
        link.parentNode?.replaceChild(styleTag, link);
      }
    }
  });

  // 2. Replace relative images with Blob URLs
  const images = doc.querySelectorAll('img');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
      const cleanSrc = src.replace(/^\.\//, '');
      const imgFile = filesMap[cleanSrc];
      if (imgFile && imgFile.blobUrl) {
        img.setAttribute('src', imgFile.blobUrl);
      }
    }
  });

  // 3. Handle CSS background images in inline styles
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    const style = el.getAttribute('style');
    if (style && style.includes('url(')) {
      let updatedStyle = style;
      const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
      let match;
      while ((match = urlRegex.exec(style)) !== null) {
        const path = match[1];
        if (!path.startsWith('data:') && !path.startsWith('http') && !path.startsWith('https')) {
          const cleanPath = path.replace(/^\.\//, '');
          const assetFile = filesMap[cleanPath];
          if (assetFile && assetFile.blobUrl) {
            updatedStyle = updatedStyle.replace(path, assetFile.blobUrl);
          }
        }
      }
      el.setAttribute('style', updatedStyle);
    }
  });

  // 4. Inject Editor helper styles into <head>
  const head = doc.head || doc.createElement('head');
  if (!doc.head) {
    doc.documentElement.insertBefore(head, doc.body);
  }

  const helperStyle = doc.createElement('style');
  helperStyle.id = 'editor-helpers';
  helperStyle.textContent = `
    /* Disable default interactions to prevent navigation or clicks triggering actions */
    a, button, input, select, textarea {
      pointer-events: none !important;
    }
    
    /* Make active text contenteditable editable, restore mouse pointer pointer-events */
    [contenteditable="true"] {
      pointer-events: auto !important;
      outline: 2px dashed #3b82f6 !important;
      background-color: rgba(59, 130, 246, 0.05) !important;
    }

    /* Disable transitions to prevent overlay lagging during hover/animations */
    * {
      transition: none !important;
    }

    /* Lock elements (pointer-events-none so click passes through to parent) */
    [data-editor-locked="true"] {
      pointer-events: none !important;
      outline: 1px dashed rgba(239, 68, 68, 0.3) !important;
    }

    /* Hide hidden elements */
    [data-editor-hidden="true"] {
      display: none !important;
    }
  `;
  head.appendChild(helperStyle);

  return doc.documentElement.outerHTML;
}
