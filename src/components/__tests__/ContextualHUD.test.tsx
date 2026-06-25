// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { ContextualHUD } from '../ContextualHUD';

describe('ContextualHUD Component', () => {
  const defaultProps = {
    tagName: 'div',
    style: {
      color: '#ff0000',
      backgroundColor: '#00ff00',
      display: 'block'
    },
    attributes: {
      id: 'test-id'
    },
    onUpdateStyles: vi.fn(),
    onUnwrap: vi.fn(),
    onWrap: vi.fn(),
    onChangeTag: vi.fn(),
    onClearStyles: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    onMoveOut: vi.fn(),
    onGroup: vi.fn(),
    hasParent: true
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the current tag name correctly', () => {
    render(<ContextualHUD {...defaultProps} />);
    const tagDisplay = screen.getByText('<div>');
    expect(tagDisplay).not.toBeNull();
  });

  it('renders spacing preset options for containers', () => {
    render(<ContextualHUD {...defaultProps} tagName="div" />);
    // Containers should render spacing buttons: P, M, G (Compact, Medium, Spacious)
    const compactBtn = screen.getByTitle('Espaçamento Compacto');
    const mediumBtn = screen.getByTitle('Espaçamento Médio');
    const spaciousBtn = screen.getByTitle('Espaçamento Largo');
    expect(compactBtn).not.toBeNull();
    expect(mediumBtn).not.toBeNull();
    expect(spaciousBtn).not.toBeNull();

    // Clicking P should call onUpdateStyles with compact padding mapping
    fireEvent.click(compactBtn);
    expect(defaultProps.onUpdateStyles).toHaveBeenCalledWith({ padding: '8px 12px' });
  });

  it('renders font adjustment controls for text elements', () => {
    const textProps = { ...defaultProps, tagName: 'p' };
    render(<ContextualHUD {...textProps} />);
    
    const sizeUpBtn = screen.getByTitle('Aumentar Fonte');
    const sizeDownBtn = screen.getByTitle('Diminuir Fonte');
    expect(sizeUpBtn).not.toBeNull();
    expect(sizeDownBtn).not.toBeNull();

    fireEvent.click(sizeUpBtn);
    expect(defaultProps.onUpdateStyles).toHaveBeenCalledWith({ fontSize: '18px' });
  });

  it('renders image inputs for image tags', () => {
    const imgProps = { ...defaultProps, tagName: 'img', attributes: { src: 'test.jpg', alt: 'Test alt' } };
    render(<ContextualHUD {...imgProps} />);

    const srcInput = screen.getByPlaceholderText('URL da Imagem (src)');
    const altInput = screen.getByPlaceholderText('Texto alt');
    expect(srcInput).not.toBeNull();
    expect(altInput).not.toBeNull();
    expect((srcInput as HTMLInputElement).value).toBe('test.jpg');
    expect((altInput as HTMLInputElement).value).toBe('Test alt');
  });

  it('shows structural actions dropdown on click', () => {
    render(<ContextualHUD {...defaultProps} />);
    const settingsBtn = screen.getByTitle('Ações Estruturais');
    expect(settingsBtn).not.toBeNull();

    fireEvent.click(settingsBtn);

    const duplicateBtn = screen.getByText('Duplicar elemento');
    const deleteBtn = screen.getByText('Excluir');
    expect(duplicateBtn).not.toBeNull();
    expect(deleteBtn).not.toBeNull();

    fireEvent.click(duplicateBtn);
    expect(defaultProps.onDuplicate).toHaveBeenCalled();
  });
});
