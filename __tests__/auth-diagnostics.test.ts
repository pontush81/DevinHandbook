import { runAuthDiagnostics, fixAuthIssues } from '@/lib/auth-diagnostics';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    }
  }
}));

// Mock window och document
const mockWindow = {
  location: { hostname: 'localhost' },
  localStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  memoryStorage: {},
};

const mockDocument = {
  cookie: 'sb-auth-token=test; other-cookie=value',
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

describe('Auth Diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('runAuthDiagnostics', () => {
    it('should return complete diagnostics object', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const diagnostics = await runAuthDiagnostics();

      expect(diagnostics).toHaveProperty('timestamp');
      expect(diagnostics).toHaveProperty('environment', 'test');
      expect(diagnostics).toHaveProperty('hostname', 'localhost');
      expect(diagnostics).toHaveProperty('cookies');
      expect(diagnostics).toHaveProperty('localStorage');
      expect(diagnostics).toHaveProperty('supabaseSession');
      expect(diagnostics).toHaveProperty('authContext');
    });

    it('should detect auth cookies correctly', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const diagnostics = await runAuthDiagnostics();

      expect(diagnostics.cookies.hasAuthCookies).toBe(true);
      expect(diagnostics.cookies.cookieCount).toBe(1);
      expect(diagnostics.cookies.cookieNames).toContain('sb-auth-token');
    });

    it('should handle localStorage access errors', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock localStorage error
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage blocked');
      });

      const diagnostics = await runAuthDiagnostics();

      expect(diagnostics.localStorage.accessible).toBe(false);
    });

    it('should handle Supabase session correctly', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const diagnostics = await runAuthDiagnostics();

      expect(diagnostics.supabaseSession.hasSession).toBe(true);
      expect(diagnostics.supabaseSession.hasUser).toBe(true);
      expect(diagnostics.supabaseSession.userId).toBe('test-user-id');
      expect(diagnostics.supabaseSession.email).toBe('test@example.com');
    });

    it('should handle Supabase errors', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const diagnostics = await runAuthDiagnostics();

      expect(diagnostics.supabaseSession.hasSession).toBe(false);
      expect(diagnostics.supabaseSession.error).toBe('Session expired');
    });
  });

  describe('fixAuthIssues', () => {
    it('should return success when session is valid', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockSession = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await fixAuthIssues();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Autentisering verkar fungera korrekt.');
    });

    it('should handle expired session and refresh', async () => {
      const { supabase } = require('@/lib/supabase');
      const expiredSession = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      const refreshedSession = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
        error: null,
      });

      const result = await fixAuthIssues();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session förnyad framgångsrikt!');
    });

    it('should handle session refresh failure', async () => {
      const { supabase } = require('@/lib/supabase');
      const expiredSession = {
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) - 3600,
      };

      supabase.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' },
      });

      supabase.auth.signOut.mockResolvedValue({});

      const result = await fixAuthIssues();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session har gått ut och kunde inte förnyas. Logga in igen.');
    });

    it('should handle no session', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await fixAuthIssues();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Ingen aktiv session hittades. Logga in igen.');
    });

    it('should handle session fetch error', async () => {
      const { supabase } = require('@/lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' },
      });

      supabase.auth.signOut.mockResolvedValue({});

      const result = await fixAuthIssues();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Session kunde inte hämtas. Du har loggats ut. Försök logga in igen.');
    });
  });
}); 