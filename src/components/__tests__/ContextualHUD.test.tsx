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

  it('toggles layout panel and interacts with flex controls', () => {
    render(<ContextualHUD {...defaultProps} tagName="div" />);
    const layoutToggle = screen.getByTitle('Ajustar Alinhamento e Layout');
    expect(layoutToggle).not.toBeNull();

    // Click to open layout details
    fireEvent.click(layoutToggle);

    const flexColBtn = screen.getByTitle('Flex Col (Empilhado)');
    expect(flexColBtn).not.toBeNull();

    fireEvent.click(flexColBtn);
    expect(defaultProps.onUpdateStyles).toHaveBeenCalledWith({ display: 'flex', flexDirection: 'column' });
  });

  it('shows component insertion dropdown and handles click', () => {
    const insertMock = vi.fn();
    render(<ContextualHUD {...defaultProps} onInsertComponent={insertMock} />);
    const insertToggle = screen.getByTitle('Inserir Componente');
    expect(insertToggle).not.toBeNull();

    fireEvent.click(insertToggle);

    const heroOption = screen.getByText('Hero Section');
    expect(heroOption).not.toBeNull();

    fireEvent.click(heroOption);
    expect(insertMock).toHaveBeenCalledWith('hero');
  });

  it('toggles classes panel, shows class badges and adds new class', () => {
    const propsWithClasses = {
      ...defaultProps,
      attributes: {
        ...defaultProps.attributes,
        class: 'bg-blue-500 shadow'
      }
    };
    render(<ContextualHUD {...propsWithClasses} />);
    const classesToggle = screen.getByTitle('Editar Classes CSS');
    expect(classesToggle).not.toBeNull();

    fireEvent.click(classesToggle);

    // Should render class pills
    const pill1 = screen.getByText('bg-blue-500');
    const pill2 = screen.getByText('shadow');
    expect(pill1).not.toBeNull();
    expect(pill2).not.toBeNull();

    // Add new class
    const input = screen.getByPlaceholderText('nova-classe');
    fireEvent.change(input, { target: { value: 'rounded-lg' } });
    
    // Submit form
    const submitBtn = screen.getByText('+');
    fireEvent.click(submitBtn);

    // expect onUpdateStyles to have been called with combined classes
    expect(defaultProps.onUpdateStyles).toHaveBeenCalledWith({ class: 'bg-blue-500 shadow rounded-lg' });
  });
});
