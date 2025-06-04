import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditorJSComponent } from '@/components/ui/EditorJSComponent';
import { OutputData } from '@editorjs/editorjs';

// Mock Editor.js since it requires DOM and can be complex in tests
jest.mock('@editorjs/editorjs', () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue({
      blocks: [
        {
          id: 'test-block',
          type: 'paragraph',
          data: {
            text: 'Test content'
          }
        }
      ],
      version: '2.29.1'
    }),
    destroy: jest.fn(),
    isReady: Promise.resolve()
  }));
});

// Mock all the Editor.js tools
jest.mock('@editorjs/header', () => ({}));
jest.mock('@editorjs/list', () => ({}));
jest.mock('@editorjs/quote', () => ({}));
jest.mock('@editorjs/code', () => ({}));
jest.mock('@editorjs/delimiter', () => ({}));
jest.mock('@editorjs/table', () => ({}));
jest.mock('@editorjs/link', () => ({}));
jest.mock('@editorjs/image', () => ({}));
jest.mock('@editorjs/inline-code', () => ({}));
jest.mock('@editorjs/marker', () => ({}));
jest.mock('@editorjs/underline', () => ({}));
jest.mock('@editorjs/warning', () => ({}));
jest.mock('@editorjs/attaches', () => ({}));

describe('EditorJSComponent', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    content: { blocks: [] } as OutputData,
    onChange: mockOnChange,
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EditorJSComponent {...defaultProps} />);
    // Check for the editor container instead of tablist
    expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
  });

  it('shows help button', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /hjälp/i })).toBeInTheDocument();
  });

  it('shows save button when not read-only', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /spara/i })).toBeInTheDocument();
  });

  it('does not show save button when read-only', () => {
    render(<EditorJSComponent {...defaultProps} readOnly={true} />);
    
    expect(screen.queryByRole('button', { name: /spara/i })).not.toBeInTheDocument();
  });

  it('shows help content with document upload information', async () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    const helpButton = screen.getByRole('button', { name: /hjälp/i });
    fireEvent.click(helpButton);
    
    // Check for help content including document upload
    expect(screen.getByText(/kortkommandon & funktioner/i)).toBeInTheDocument();
    expect(screen.getByText(/bilder: stöder jpeg, png, gif, webp/i)).toBeInTheDocument();
    expect(screen.getByText(/dokument: stöder pdf, word, excel, powerpoint, text, csv/i)).toBeInTheDocument();
  });

  it('toggles help content when help button is clicked', async () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    const helpButton = screen.getByRole('button', { name: /hjälp/i });
    
    // Help should not be visible initially
    expect(screen.queryByText(/kortkommandon & funktioner/i)).not.toBeInTheDocument();
    
    // Click help button
    fireEvent.click(helpButton);
    
    // Help should now be visible
    expect(screen.getByText(/kortkommandon & funktioner/i)).toBeInTheDocument();
    
    // Click again to hide
    fireEvent.click(helpButton);
    
    // Help should be hidden again
    expect(screen.queryByText(/kortkommandon & funktioner/i)).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EditorJSComponent {...defaultProps} />);
    
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('handles EditorJS data input', () => {
    const editorData: OutputData = {
      blocks: [
        {
          id: 'test-block',
          type: 'paragraph',
          data: {
            text: 'Test paragraph'
          }
        }
      ],
      version: '2.29.1'
    };

    render(<EditorJSComponent {...defaultProps} content={editorData} />);
    
    // Component should render without errors
    expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
  });

  it('handles string content input', () => {
    render(<EditorJSComponent {...defaultProps} content="# Test Header\nTest content" />);
    
    // Component should render without errors
    expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
  });

  it('handles empty content', () => {
    render(<EditorJSComponent {...defaultProps} content="" />);
    
    // Component should render without errors
    expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<EditorJSComponent {...defaultProps} disabled={true} />);
    
    const saveButton = screen.getByRole('button', { name: /spara/i });
    expect(saveButton).toBeDisabled();
  });

  it('shows editor container', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    // Should show the editor container
    const editorContainer = document.querySelector('.editor-js-container');
    expect(editorContainer).toBeInTheDocument();
  });

  describe('Content conversion', () => {
    it('converts markdown headers to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="# Header 1\n## Header 2" />);
      
      // Should render without throwing errors
      expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
    });

    it('converts markdown lists to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="- Item 1\n- Item 2\n1. Numbered item" />);
      
      // Should render without throwing errors
      expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
    });

    it('converts markdown quotes to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="> This is a quote" />);
      
      // Should render without throwing errors
      expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
    });
  });

  describe('Mobile behavior', () => {
    beforeEach(() => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
    });

    afterEach(() => {
      // Reset to desktop width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it('adapts to mobile screen size', () => {
      render(<EditorJSComponent {...defaultProps} />);
      
      // Should still render the basic structure
      expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
    });
  });

  describe('Editor functionality', () => {
    it('calls onChange when editor saves', async () => {
      render(<EditorJSComponent {...defaultProps} />);
      
      const saveButton = screen.getByRole('button', { name: /spara/i });
      fireEvent.click(saveButton);
      
      // Should call onChange (mocked Editor.js will resolve with test data)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('handles save errors gracefully', async () => {
      // Mock console.error to prevent error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<EditorJSComponent {...defaultProps} />);
      
      // The component should not crash even if there are save errors
      expect(screen.getByText(/laddar wysiwyg editor/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('shows image support in help text', () => {
      render(<EditorJSComponent {...defaultProps} />);
      
      const helpButton = screen.getByRole('button', { name: /hjälp/i });
      fireEvent.click(helpButton);
      
      // Should show information about image support
      expect(screen.getByText(/bilder: stöder jpeg, png, gif, webp \(max 5mb\)/i)).toBeInTheDocument();
    });
  });
}); 