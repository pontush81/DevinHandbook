import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock Supabase
const mockSignInWithPassword = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

// Mock redirect utils
jest.mock('@/lib/redirect-utils', () => ({
  smartRedirectWithPolling: jest.fn(),
}));

describe('LoginForm Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows improved error message for invalid credentials', async () => {
    // Mock invalid credentials error
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    render(<LoginForm />);

    // Fill in form
    fireEvent.change(screen.getByLabelText(/e-post/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/lösenord/i), {
      target: { value: 'wrongpassword' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /logga in/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/e-postadressen eller lösenordet stämmer inte/i)).toBeInTheDocument();
    });

    // Check that helpful text is included
    expect(screen.getByText(/kom ihåg att lösenord är skiftlägeskänsliga/i)).toBeInTheDocument();

    // Check that "Forgot password" button appears
    expect(screen.getByText(/glömt lösenord\? återställ här/i)).toBeInTheDocument();
  });

  it('shows forgot password form when user clicks forgot password button in error', async () => {
    // Mock invalid credentials error
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    render(<LoginForm />);

    // Fill in form and submit to trigger error
    fireEvent.change(screen.getByLabelText(/e-post/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/lösenord/i), {
      target: { value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: /logga in/i }));

    // Wait for error and forgot password button
    await waitFor(() => {
      expect(screen.getByText(/glömt lösenord\? återställ här/i)).toBeInTheDocument();
    });

    // Click forgot password button
    fireEvent.click(screen.getByText(/glömt lösenord\? återställ här/i));

    // Should now show password reset form
    expect(screen.getByRole('button', { name: /skicka återställningslänk/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/lösenord/i)).not.toBeInTheDocument();
  });

  it('clears forgot password button when form is resubmitted', async () => {
    // Mock invalid credentials error first, then success
    mockSignInWithPassword
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })
      .mockResolvedValueOnce({
        data: { 
          user: { id: '123', email: 'test@example.com' }, 
          session: { access_token: 'token', expires_at: Date.now() / 1000 + 3600 }
        },
        error: null
      });

    render(<LoginForm />);

    // First attempt - wrong credentials
    fireEvent.change(screen.getByLabelText(/e-post/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/lösenord/i), {
      target: { value: 'wrongpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: /logga in/i }));

    // Wait for error and forgot password button
    await waitFor(() => {
      expect(screen.getByText(/glömt lösenord\? återställ här/i)).toBeInTheDocument();
    });

    // Second attempt - correct credentials
    fireEvent.change(screen.getByLabelText(/lösenord/i), {
      target: { value: 'correctpassword' }
    });
    fireEvent.click(screen.getByRole('button', { name: /logga in/i }));

    // Forgot password button should be gone
    await waitFor(() => {
      expect(screen.queryByText(/glömt lösenord\? återställ här/i)).not.toBeInTheDocument();
    });
  });
}); 