import { useState, useCallback } from 'react';
import type { ProjectDirectory, FileItem } from '../types';

export function useFileSystem() {
  const [project, setProject] = useState<ProjectDirectory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMimeType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      case 'js': return 'application/javascript';
      case 'json': return 'application/json';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'svg': return 'image/svg+xml';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      default: return 'application/octet-stream';
    }
  };

  const isTextFile = (mimeType: string): boolean => {
    return mimeType.startsWith('text/') || 
           mimeType === 'application/javascript' || 
           mimeType === 'application/json';
  };

  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const readDirectoryRecursive = async (
    dirHandle: FileSystemDirectoryHandle,
    relativePath = '',
    filesMap: Record<string, FileItem> = {}
  ): Promise<Record<string, FileItem>> => {
    for await (const entry of dirHandle.values()) {
      const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'directory') {
        filesMap[entryPath] = {
          name: entry.name,
          relativePath: entryPath,
          type: 'directory',
          handle: entry
        };
        await readDirectoryRecursive(entry, entryPath, filesMap);
      } else {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const mimeType = getMimeType(entry.name);
        
        let content: string | undefined;
        let blobUrl: string | undefined;

        if (isTextFile(mimeType)) {
          content = await file.text();
        } else if (isImageFile(mimeType)) {
          blobUrl = URL.createObjectURL(file);
        }

        filesMap[entryPath] = {
          name: entry.name,
          relativePath: entryPath,
          type: 'file',
          handle: fileHandle,
          content,
          blobUrl,
          mimeType
        };
      }
    }
    return filesMap;
  };

  const openDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Chrome/Edge/Safari support window.showDirectoryPicker
      if (!(window as any).showDirectoryPicker) {
        throw new Error('Seu navegador não suporta a File System Access API. Use Chrome, Edge ou Safari.');
      }
      
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      const filesMap = await readDirectoryRecursive(dirHandle);
      
      setProject({
        handle: dirHandle,
        name: dirHandle.name,
        files: filesMap
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Erro ao carregar diretório.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFile = useCallback(async (relativePath: string, newContent: string) => {
    if (!project) return;
    
    const fileItem = project.files[relativePath];
    if (!fileItem || fileItem.type !== 'file') {
      throw new Error(`Arquivo não encontrado: ${relativePath}`);
    }

    const fileHandle = fileItem.handle as FileSystemFileHandle;
    const writable = await fileHandle.createWritable();
    await writable.write(newContent);
    await writable.close();

    // Update state
    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: {
          ...prev.files,
          [relativePath]: {
            ...fileItem,
            content: newContent
          }
        }
      };
    });
  }, [project]);

  const saveImage = useCallback(async (relativePath: string, fileBlob: Blob) => {
    if (!project) return;

    let fileItem = project.files[relativePath];
    let fileHandle: FileSystemFileHandle;

    if (!fileItem) {
      // Create new file if it doesn't exist
      const pathParts = relativePath.split('/');
      const fileName = pathParts.pop()!;
      let currentDir = project.handle;
      
      // Traverse subdirectories to find or create them
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
      }
      
      fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    } else {
      fileHandle = fileItem.handle as FileSystemFileHandle;
    }

    const writable = await fileHandle.createWritable();
    await writable.write(fileBlob);
    await writable.close();

    // Revoke old blob url if it existed
    if (fileItem?.blobUrl) {
      URL.revokeObjectURL(fileItem.blobUrl);
    }

    const newBlobUrl = URL.createObjectURL(fileBlob);
    const mimeType = getMimeType(relativePath.split('/').pop()!);

    setProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        files: {
          ...prev.files,
          [relativePath]: {
            name: relativePath.split('/').pop()!,
            relativePath,
            type: 'file',
            handle: fileHandle,
            blobUrl: newBlobUrl,
            mimeType
          }
        }
      };
    });

    return newBlobUrl;
  }, [project]);

  return {
    project,
    loading,
    error,
    openDirectory,
    saveFile,
    saveImage,
    setProject
  };
}
