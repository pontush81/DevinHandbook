import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

describe('Dialog Component', () => {
  it('renders dialog trigger correctly', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
      </Dialog>
    );
    
    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    expect(trigger).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    
    const trigger = screen.getByRole('button', { name: 'Open Dialog' });
    fireEvent.click(trigger);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
  });

  it('has proper background styling for DialogContent', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    
    const dialogContent = screen.getByTestId('dialog-content');
    
    // Verify the dialog has proper background styling (not transparent)
    expect(dialogContent).toHaveClass('bg-background');
    expect(dialogContent).toHaveClass('border');
    expect(dialogContent).toHaveClass('shadow-lg');
  });

  it('renders dialog with footer actions', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>Are you sure you want to proceed?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('closes dialog when close button is clicked', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    
    // Find the close button (usually has aria-label="Close")
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Dialog should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports controlled open state', () => {
    const TestComponent = () => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>Open Controlled Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    };
    
    render(<TestComponent />);
    
    const trigger = screen.getByRole('button', { name: 'Open Controlled Dialog' });
    fireEvent.click(trigger);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders delete confirmation dialog with proper styling', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent className="bg-white border border-gray-200 shadow-lg">
          <DialogHeader>
            <DialogTitle>Radera handbok</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera handboken "Test Handbok"? 
              Detta kan inte ångras och all data kommer att försvinna permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline">Avbryt</Button>
            <Button className="bg-red-600 hover:bg-red-700">
              Radera handbok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    
    const dialogContent = screen.getByRole('dialog');
    
    // Verify explicit styling is applied
    expect(dialogContent).toHaveClass('bg-white', 'border', 'border-gray-200', 'shadow-lg');
    
    // Verify content
    expect(screen.getByText('Radera handbok')).toBeInTheDocument();
    expect(screen.getByText(/Är du säker på att du vill radera/)).toBeInTheDocument();
    
    // Verify buttons
    expect(screen.getByRole('button', { name: 'Avbryt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Radera handbok' })).toBeInTheDocument();
  });
}); 