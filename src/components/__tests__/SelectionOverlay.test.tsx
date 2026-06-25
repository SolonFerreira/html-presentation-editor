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
});
