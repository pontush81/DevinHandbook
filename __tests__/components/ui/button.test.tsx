import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with default blue styling', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('applies correct styling for different variants', () => {
    const { rerender } = render(<Button variant="outline">Outline Button</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('border', 'bg-background');
    
    rerender(<Button variant="destructive">Delete Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive', 'text-white');
    
    rerender(<Button variant="secondary">Secondary Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
  });

  it('applies correct sizing', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-8');
    
    rerender(<Button size="lg">Large Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('maintains consistent blue styling across variants', () => {
    render(<Button>Primary Button</Button>);
    
    const button = screen.getByRole('button');
    
    // Verify that primary buttons have blue background
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-primary-foreground');
    
    // Verify hover states
    expect(button).toHaveClass('hover:bg-primary/90');
  });

  it('allows custom className override', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    // Should still have base classes
    expect(button).toHaveClass('bg-primary');
  });
}); 