// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SelectionOverlay } from '../SelectionOverlay';

describe('SelectionOverlay Component', () => {
  const defaultProps = {
    selectedRect: { top: 10, left: 20, width: 200, height: 100 },
    hoveredRect: null,
    selectedTag: 'div',
    hoveredTag: null
  };

  afterEach(() => {
    cleanup();
  });

  it('renders tag and dimensions badge correctly', () => {
    const { getByText } = render(<SelectionOverlay {...defaultProps} />);
    expect(getByText('div')).not.toBeNull();
    expect(getByText('200 × 100')).not.toBeNull();
  });

  it('renders padding overlays when selectedPadding is provided', () => {
    const paddingProps = {
      ...defaultProps,
      selectedPadding: { top: 20, right: 15, bottom: 20, left: 15 }
    };
    const { container } = render(<SelectionOverlay {...paddingProps} />);
    
    // Check if green padding overlays are rendered by style values
    const topPadding = container.querySelector('[style*="height: 20px"][style*="top: 0"]');
    const bottomPadding = container.querySelector('[style*="height: 20px"][style*="bottom: 0"]');
    const leftPadding = container.querySelector('[style*="width: 15px"][style*="left: 0"]');
    const rightPadding = container.querySelector('[style*="width: 15px"][style*="right: 0"]');
    
    expect(topPadding).not.toBeNull();
    expect(bottomPadding).not.toBeNull();
    expect(leftPadding).not.toBeNull();
    expect(rightPadding).not.toBeNull();
  });

  it('renders flex direction axis and indicator badges when display flex is active', () => {
    const flexProps = {
      ...defaultProps,
      selectedDisplay: 'flex',
      selectedFlexDirection: 'column'
    };
    const { getByText } = render(<SelectionOverlay {...flexProps} />);
    
    // Check type badge
    expect(getByText('FLEX COL')).not.toBeNull();
    
    // Check axis line for column direction
    expect(getByText('col ↓')).not.toBeNull();
  });

  it('renders outlines for all selected elements but badges/handles only on primary element', () => {
    const multiProps = {
      selectedElementId: 'el-1',
      selectedRect: { top: 10, left: 20, width: 200, height: 100 },
      selectedRects: [
        { top: 10, left: 20, width: 200, height: 100 },
        { top: 120, left: 20, width: 200, height: 80 }
      ],
      hoveredRect: null,
      selectedTag: 'div',
      selectedTags: ['div', 'p'],
      hoveredTag: null
    };

    const { container, queryByText, getByText } = render(<SelectionOverlay {...multiProps} />);

    // Outlines should be rendered for both elements
    const selectedContainers = container.querySelectorAll('.border-2.border-blue-500');
    expect(selectedContainers.length).toBe(2);

    // Primary element tag badge (div) and dimensions (200 x 100) should be rendered
    expect(getByText('div')).not.toBeNull();
    expect(getByText('200 × 100')).not.toBeNull();

    // Secondary element tag badge (p) and dimensions (200 x 80) should NOT be rendered
    expect(queryByText('p')).toBeNull();
    expect(queryByText('200 × 80')).toBeNull();
    
    // There should be a Grip icon for dragging
    const gripHandle = container.querySelector('[draggable="true"]');
    expect(gripHandle).not.toBeNull();
    expect(gripHandle?.getAttribute('data-editor-id')).toBe('el-1');
  });

  it('renders drop target indicator box when dropPosition is inside', () => {
    const dropProps = {
      selectedRect: null,
      hoveredRect: null,
      selectedTag: null,
      hoveredTag: null,
      dropTargetRect: { top: 50, left: 100, width: 300, height: 150 },
      dropPosition: 'inside' as const
    };

    const { container } = render(<SelectionOverlay {...dropProps} />);

    // Visual drop target container check
    const dropBox = container.querySelector('[class*="border-dashed"][class*="border-blue-500"]');
    expect(dropBox).not.toBeNull();
    expect(dropBox?.getAttribute('style')).toContain('top: 50px');
    expect(dropBox?.getAttribute('style')).toContain('width: 300px');
  });

  it('renders drop line when dropPosition is before or after', () => {
    const dropProps = {
      selectedRect: null,
      hoveredRect: null,
      selectedTag: null,
      hoveredTag: null,
      dropTargetRect: { top: 50, left: 100, width: 300, height: 150 },
      dropPosition: 'before' as const
    };

    const { container } = render(<SelectionOverlay {...dropProps} />);

    // Visual drop line check
    const dropLine = container.querySelector('[class*="bg-blue-500"]');
    expect(dropLine).not.toBeNull();
    expect(dropLine?.getAttribute('style')).toContain('top: 48px'); // 50px - 2px offset
    expect(dropLine?.getAttribute('style')).toContain('width: 300px');

    // Precision dot check
    const dot = dropLine?.querySelector('.rounded-full');
    expect(dot).not.toBeNull();
  });
});
