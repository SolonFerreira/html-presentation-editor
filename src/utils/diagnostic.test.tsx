// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

let sidebarMountCount = 0;
let sidebarUnmountCount = 0;
let sidebarRenderCount = 0;

// Mock Sidebar component
vi.mock('../components/Sidebar', () => {
  return {
    Sidebar: (props: any) => {
      sidebarRenderCount++;
      useEffect(() => {
        sidebarMountCount++;
        return () => {
          sidebarUnmountCount++;
        };
      }, []);
      
      return (
        <aside>
          <div className="overflow-y-auto">
            {props.semanticTree && props.semanticTree.map((node: any) => (
              <div 
                key={node.id} 
                className="cursor-pointer"
                onClick={() => props.onSelectElement(node.id)}
              >
                <span>div {node.id}</span>
                <button 
                  title="Bloquear Elemento" 
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleLock(node.id);
                  }}
                >
                  Lock
                </button>
              </div>
            ))}
          </div>
        </aside>
      );
    }
  };
});

// Mock localStorage, window.showDirectoryPicker, ResizeObserver
if (typeof window !== 'undefined') {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: vi.fn().mockImplementation((key: string) => store[key] || null),
    setItem: vi.fn().mockImplementation((key: string, value: string) => {
      store[key] = value;
    }),
    clear: vi.fn().mockImplementation(() => {
      for (const k in store) delete store[k];
    }),
    removeItem: vi.fn().mockImplementation((key: string) => {
      delete store[key];
    })
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  (window as any).showDirectoryPicker = vi.fn().mockImplementation(() => {
    return {
      name: 'mock-dir',
      kind: 'directory'
    };
  });

  (window as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock useFileSystem hook to return a mock project immediately
vi.mock('../hooks/useFileSystem', () => {
  let projectVal: any = {
    handle: { kind: 'directory', name: 'mock-dir' },
    name: 'mock-project',
    files: {
      'index.html': {
        name: 'index.html',
        relativePath: 'index.html',
        type: 'file',
        content: `
          <html>
            <body>
              <div id="div1">Element 1</div>
              <div id="div2">Element 2</div>
              <div id="div3">Element 3</div>
              <div id="div4">Element 4</div>
              <div id="div5">Element 5</div>
              <div id="div6">Element 6</div>
              <div id="div7">Element 7</div>
              <div id="div8">Element 8</div>
              <div id="div9">Element 9</div>
              <div id="div10">Element 10</div>
            </body>
          </html>
        `,
        handle: { kind: 'file', name: 'index.html' }
      }
    }
  };
  return {
    useFileSystem: () => ({
      project: projectVal,
      openDirectory: vi.fn(),
      saveFile: vi.fn().mockImplementation(async (path, content) => {
        projectVal.files[path].content = content;
      }),
      saveImage: vi.fn()
    })
  };
});

import App from '../App';

describe('Real Scroll Reset Diagnostic on Edit', () => {
  it('should test if scrollTop of layers tree resets on edit', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    
    // Mount App
    await act(async () => {
      root.render(<App />);
    });

    // Wait a brief tick for the handleSelectFile effect to finish loading
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Find the scrollable container in Sidebar
    const sidebarElement = container.querySelector('aside');
    expect(sidebarElement).toBeTruthy();
    
    const scrollContainer = sidebarElement?.querySelector('.overflow-y-auto') as HTMLDivElement;
    expect(scrollContainer).toBeTruthy();

    // Mock scrollHeight to be large, and clientHeight to be small to allow scrolling
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 200, configurable: true });

    // Scroll to 150
    scrollContainer.scrollTop = 150;
    expect(scrollContainer.scrollTop).toBe(150);

    // Find a layer item to click and select it
    const layerItems = sidebarElement?.querySelectorAll('.cursor-pointer');
    const layerItem = Array.from(layerItems || []).find(el => el.textContent?.includes('div'));
    expect(layerItem).toBeTruthy();

    // Click it to select
    await act(async () => {
      (layerItem as HTMLElement).click();
    });

    // Wait a brief tick
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Let's verify selection is set
    expect(scrollContainer.scrollTop).toBe(150);

    console.log(`[Before Edit] ScrollTop: ${scrollContainer.scrollTop}`);

    // Click on the lock button of the layer item to trigger a state update
    // The lock button has title "Bloquear Elemento"
    const lockBtn = layerItem?.querySelector('button[title*="Bloquear"]');
    expect(lockBtn).toBeTruthy();

    // Trigger lock change (which is an edit and saves file)
    await act(async () => {
      (lockBtn as HTMLButtonElement).click();
    });

    // Wait a brief tick for saving and state updates
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    console.log(`[After Edit] ScrollTop: ${scrollContainer.scrollTop}`);

    root.unmount();
    document.body.removeChild(container);
  });
});
