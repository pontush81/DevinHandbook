import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

// Mock Supabase
const mockSignInWithOAuth = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  },
}));

// Mock window.location
const mockAssign = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    assign: mockAssign,
  },
  writable: true,
});

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Google login button', () => {
    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should show loading state when isLoading is true', () => {
    render(<GoogleLoginButton isLoading={true} />);
    
    const button = screen.getByRole('button', { name: /loggar in/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should call signInWithOAuth when clicked', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    
    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
    });
  });

  it('should include join code in redirect URL when provided', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const joinCode = 'test-join-code';
    
    render(<GoogleLoginButton joinCode={joinCode} />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `http://localhost:3000/auth/callback?join=${encodeURIComponent(joinCode)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile'
        }
      });
    });
  });

  it('should include redirect URL when provided', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const redirectTo = '/dashboard';
    
    render(<GoogleLoginButton redirectTo={redirectTo} />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `http://localhost:3000/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
    });
  });

  it('should handle OAuth errors gracefully', async () => {
    const mockError = new Error('OAuth error');
    mockSignInWithOAuth.mockResolvedValue({ error: mockError });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<GoogleLoginButton />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Google login error:', mockError);
    });
    
    consoleSpy.mockRestore();
  });

  it('should call onLoadingChange callback', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const onLoadingChange = jest.fn();
    
    render(<GoogleLoginButton onLoadingChange={onLoadingChange} />);
    
    const button = screen.getByRole('button', { name: /fortsätt med google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onLoadingChange).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });
  });

  it('should be disabled when loading', () => {
    render(<GoogleLoginButton isLoading={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
}); 