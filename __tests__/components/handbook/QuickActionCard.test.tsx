import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAction } from '@/lib/templates/complete-brf-handbook';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
  },
  writable: true,
});

// Mock window.open
global.open = jest.fn();

describe('QuickActionCard', () => {
  const mockEmailAction: QuickAction = {
    id: '1',
    title: 'Kontakta styrelsen',
    description: 'Skicka meddelande till styrelsen',
    icon: '📧',
    actionType: 'email',
    actionValue: 'styrelsen@example.se',
    isPrimary: true
  };

  const mockPhoneAction: QuickAction = {
    id: '2',
    title: 'Ring fastighetsskötare',
    description: 'Direkt kontakt för akuta ärenden',
    icon: '📞',
    actionType: 'phone',
    actionValue: '070-123-45-67',
    isPrimary: false
  };

  const mockLinkAction: QuickAction = {
    id: '3',
    title: 'Digital felanmälan',
    description: 'Anmäl fel online',
    icon: '💻',
    actionType: 'link',
    actionValue: 'https://example.se/felanmalan',
    isPrimary: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action card with correct information', () => {
    render(<QuickActionCard action={mockEmailAction} />);
    
    expect(screen.getByText('Kontakta styrelsen')).toBeInTheDocument();
    expect(screen.getByText('Skicka meddelande till styrelsen')).toBeInTheDocument();
    expect(screen.getByText('📧')).toBeInTheDocument();
  });

  it('applies primary styling for primary actions', () => {
    const { container } = render(<QuickActionCard action={mockEmailAction} />);
    const button = container.firstChild as HTMLElement;
    
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('text-white');
  });

  it('applies secondary styling for non-primary actions', () => {
    const { container } = render(<QuickActionCard action={mockPhoneAction} />);
    const button = container.firstChild as HTMLElement;
    
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-gray-900');
  });

  it('handles email action click', () => {
    render(<QuickActionCard action={mockEmailAction} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    expect(window.location.href).toBe('mailto:styrelsen@example.se');
  });

  it('handles phone action click', () => {
    render(<QuickActionCard action={mockPhoneAction} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    expect(window.location.href).toBe('tel:070-123-45-67');
  });

  it('handles link action click', () => {
    render(<QuickActionCard action={mockLinkAction} />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    expect(global.open).toHaveBeenCalledWith('https://example.se/felanmalan', '_blank');
  });

  it('has proper accessibility attributes', () => {
    render(<QuickActionCard action={mockEmailAction} />);
    const button = screen.getByRole('button');
    
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });
}); 