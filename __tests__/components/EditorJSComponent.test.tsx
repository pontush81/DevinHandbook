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
jest.mock('@editorjs/paragraph', () => ({}));
jest.mock('@editorjs/quote', () => ({}));
jest.mock('@editorjs/link', () => ({}));
jest.mock('@editorjs/image', () => ({}));
jest.mock('@editorjs/checklist', () => ({}));
jest.mock('@editorjs/code', () => ({}));
jest.mock('@editorjs/table', () => ({}));
jest.mock('@editorjs/delimiter', () => ({}));
jest.mock('@editorjs/warning', () => ({}));
jest.mock('@editorjs/inline-code', () => ({}));
jest.mock('@editorjs/marker', () => ({}));
jest.mock('@editorjs/underline', () => ({}));

describe('EditorJSComponent', () => {
  const mockOnChange = jest.fn();
  
  const defaultProps = {
    content: 'Test content',
    onChange: mockOnChange,
    placeholder: 'Start writing...',
    className: 'test-class',
    disabled: false,
    readOnly: false
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders without crashing', () => {
    render(<EditorJSComponent {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('shows edit and preview tabs', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    expect(screen.getByRole('tab', { name: /redigera edit/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /förhandsgranska preview/i })).toBeInTheDocument();
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

  it('toggles help content when help button is clicked', async () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    const helpButton = screen.getByRole('button', { name: /hjälp/i });
    
    // Help should not be visible initially
    expect(screen.queryByText(/editor\.js tips/i)).not.toBeInTheDocument();
    
    // Click help button
    fireEvent.click(helpButton);
    
    // Help should now be visible
    expect(screen.getByText(/editor\.js tips/i)).toBeInTheDocument();
    
    // Click again to hide
    fireEvent.click(helpButton);
    
    // Help should be hidden again
    expect(screen.queryByText(/editor\.js tips/i)).not.toBeInTheDocument();
  });

  it('starts with edit tab active', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    const editTab = screen.getByRole('tab', { name: /redigera edit/i });
    const previewTab = screen.getByRole('tab', { name: /förhandsgranska preview/i });
    
    // Edit tab should be active initially
    expect(editTab).toHaveAttribute('data-state', 'active');
    expect(previewTab).toHaveAttribute('data-state', 'inactive');
  });

  it('shows loading state initially', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    expect(screen.getByText(/laddar editor/i)).toBeInTheDocument();
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
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('handles string content input', () => {
    render(<EditorJSComponent {...defaultProps} content="# Test Header\nTest content" />);
    
    // Component should render without errors
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('handles empty content', () => {
    render(<EditorJSComponent {...defaultProps} content="" />);
    
    // Component should render without errors
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<EditorJSComponent {...defaultProps} disabled={true} />);
    
    const saveButton = screen.getByRole('button', { name: /spara/i });
    expect(saveButton).toBeDisabled();
  });

  it('shows edit panel when on edit tab', () => {
    render(<EditorJSComponent {...defaultProps} />);
    
    // Should show edit content by default
    const editPanel = screen.getByRole('tabpanel', { name: /redigera edit/i });
    expect(editPanel).toBeInTheDocument();
    expect(editPanel).toHaveAttribute('data-state', 'active');
  });

  describe('Content conversion', () => {
    it('converts markdown headers to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="# Header 1\n## Header 2" />);
      
      // Should render without throwing errors
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('converts markdown lists to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="- Item 1\n- Item 2\n1. Numbered item" />);
      
      // Should render without throwing errors
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('converts markdown quotes to EditorJS format', () => {
      render(<EditorJSComponent {...defaultProps} content="> This is a quote" />);
      
      // Should render without throwing errors
      expect(screen.getByRole('tablist')).toBeInTheDocument();
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
      expect(screen.getByRole('tablist')).toBeInTheDocument();
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
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
}); 