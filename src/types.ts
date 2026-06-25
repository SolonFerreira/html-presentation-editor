export interface SemanticElement {
  id: string;        // Unique temporary editor ID (e.g., 'el-1', 'el-2')
  tagName: string;   // HTML tag name (e.g., 'DIV', 'H1', 'IMG')
  role: 'slide' | 'card' | 'title' | 'text' | 'image' | 'container' | 'button' | 'unknown';
  text?: string;     // Inner text if applicable (and short)
  classes: string[]; // List of CSS classes
  style: Record<string, string>; // Inline styles (or computed styles)
  children: SemanticElement[];
  xpath: string;     // XPath or selector to map back to the real DOM element
  isLocked?: boolean; // If element is locked in layers panel
  isHidden?: boolean; // If element is hidden in layers panel
}

export interface FileItem {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  content?: string; // Text content (loaded for html, css, js)
  blobUrl?: string; // Blob URL for preview (loaded for images)
  mimeType?: string;
}

export interface ProjectDirectory {
  handle: FileSystemDirectoryHandle;
  name: string;
  files: Record<string, FileItem>; // key: relativePath
}

export interface VersionEntry {
  id: string;
  timestamp: string;
  description: string;
  htmlContent: string;
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface EditorState {
  project: ProjectDirectory | null;
  activeHtmlPath: string | null; // e.g., 'index.html'
  selectedElementId: string | null;
  hoveredElementId: string | null;
  semanticTree: SemanticElement[];
  undoStack: string[];
  redoStack: string[];
  zoomScale: number;
  viewportMode: ViewportMode;
  presentationMode: boolean;
  versionHistory: VersionEntry[];
}
