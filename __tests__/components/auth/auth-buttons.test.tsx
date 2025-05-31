import React from 'react';
import { render, screen } from '@testing-library/react';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Auth Button Styles', () => {
  test('signup form has blue primary button', () => {
    render(<SignUpForm showLoginLink={false} />);
    
    const signupButton = screen.getByRole('button', { name: /skapa konto/i });
    expect(signupButton).toBeInTheDocument();
    expect(signupButton).toHaveClass('bg-blue-600');
    expect(signupButton).toHaveClass('hover:bg-blue-700');
  });

  test('login form has blue primary button', () => {
    render(<LoginForm showSignupLink={false} />);
    
    const loginButton = screen.getByRole('button', { name: /logga in/i });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveClass('bg-blue-600');
    expect(loginButton).toHaveClass('hover:bg-blue-700');
    expect(loginButton).toHaveClass('text-white');
  });
}); 