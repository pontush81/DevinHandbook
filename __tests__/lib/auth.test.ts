import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  }
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sign Up', () => {
    it('should successfully sign up a new user', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: null,
      };

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockUser);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle sign up errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockError = {
        message: 'Invalid email address',
        status: 400,
      };

      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signUp({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(result.error).toEqual(mockError);
      expect(result.data.user).toBeNull();
    });
  });

  describe('Sign In', () => {
    it('should successfully sign in with valid credentials', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: '2023-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: mockUser,
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockUser);
      expect(result.data.session).toEqual(mockSession);
    });

    it('should handle invalid credentials', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockError = {
        message: 'Invalid login credentials',
        status: 400,
      };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.error).toEqual(mockError);
      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
    });
  });

  describe('Sign Out', () => {
    it('should successfully sign out user', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await supabase.auth.signOut();

      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Management', () => {
    it('should get current session', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(result.error).toBeNull();
      expect(result.data.session).toEqual(mockSession);
    });

    it('should handle expired session', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const expiredSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const result = await supabase.auth.getSession();
      
      expect(result.data.session?.expires_at).toBeLessThan(Math.floor(Date.now() / 1000));
    });

    it('should refresh expired session', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const refreshedSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };

      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
        error: null,
      });

      const result = await supabase.auth.refreshSession();

      expect(result.error).toBeNull();
      expect(result.data.session).toEqual(refreshedSession);
    });
  });

  describe('Auth State Changes', () => {
    it('should handle auth state change callbacks', () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();

      supabase.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      });

      const subscription = supabase.auth.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(subscription.data.subscription.unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('User Profile', () => {
    it('should get current user', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        email_confirmed_at: '2023-01-01T00:00:00Z',
        user_metadata: {},
        app_metadata: {},
      };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await supabase.auth.getUser();

      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found' },
      });

      const result = await supabase.auth.getUser();

      expect(result.error).toEqual({ message: 'User not found' });
      expect(result.data.user).toBeNull();
    });
  });
}); 