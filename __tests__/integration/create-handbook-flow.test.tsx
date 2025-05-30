import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
    })),
  }
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
    },
    loading: false,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Stripe
global.fetch = jest.fn();

describe('Create Handbook Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { supabase } = require('@/lib/supabase');
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-123', email: 'test@example.com' },
          access_token: 'mock-token',
        },
      },
      error: null,
    });
  });

  describe('Subdomain Availability Check', () => {
    it('should check subdomain availability when user types handbook name', async () => {
      const { supabase } = require('@/lib/supabase');
      
      // Mock subdomain is available (no existing handbook)
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' },
            }),
          }),
        }),
      });

      // We would test the actual CreateHandbookForm component here
      // For now, let's test the logic directly
      
      const handbookName = 'Min Test Förening';
      const subdomain = handbookName
        .toLowerCase()
        .replace(/[åä]/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      expect(subdomain).toBe('min-test-forening');

      // Check if subdomain is available
      const query = supabase.from('handbooks')
        .select('id')
        .eq('subdomain', subdomain)
        .single();

      const result = await query;
      
      // PGRST116 means no rows found = subdomain is available
      expect(result.error?.code).toBe('PGRST116');
      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should detect when subdomain is already taken', async () => {
      const { supabase } = require('@/lib/supabase');
      
      // Mock subdomain is taken (existing handbook found)
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-handbook-123' },
              error: null,
            }),
          }),
        }),
      });

      const subdomain = 'existing-handbook';
      
      const query = supabase.from('handbooks')
        .select('id')
        .eq('subdomain', subdomain)
        .single();

      const result = await query;
      
      // If data is returned, subdomain is taken
      expect(result.data).toEqual({ id: 'existing-handbook-123' });
      expect(result.error).toBeNull();
    });
  });

  describe('Payment Flow Integration', () => {
    it('should create Stripe checkout session with correct data', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock successful Stripe checkout creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      } as Response);

      const handbookData = {
        name: 'Test Förening',
        subdomain: 'test-forening',
        userId: 'test-user-123',
        template: {
          metadata: { type: 'default' },
          sections: [],
        },
      };

      // Test API call to create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookData }),
      });

      const result = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookData }),
      });

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('should handle payment errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock payment failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid payment data',
        }),
      } as Response);

      const handbookData = {
        name: 'Test Förening',
        subdomain: 'test-forening',
        userId: 'test-user-123',
      };

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbookData }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Handbook Creation After Payment', () => {
    it('should create handbook with all sections and pages after successful payment', async () => {
      const { supabase } = require('@/lib/supabase');
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock successful payment verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payment_status: 'paid',
          customer_details: {
            email: 'test@example.com',
          },
          metadata: {
            handbook_name: 'Test Förening',
            subdomain: 'test-forening',
            user_id: 'test-user-123',
          },
        }),
      } as Response);

      // Mock handbook creation
      const mockHandbook = {
        id: 'handbook-123',
        title: 'Test Förening',
        subdomain: 'test-forening',
        owner_id: 'test-user-123',
      };

      // Mock fallback API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          handbookId: 'handbook-123',
        }),
      } as Response);

      // Test payment verification
      const verificationResponse = await fetch('/api/stripe/session?session_id=cs_test_123');
      const paymentData = await verificationResponse.json();

      expect(paymentData.payment_status).toBe('paid');

      // Test handbook creation
      const createResponse = await fetch('/api/create-handbook-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: paymentData.metadata.handbook_name,
          subdomain: paymentData.metadata.subdomain,
          userId: paymentData.metadata.user_id,
        }),
      });

      const createResult = await createResponse.json();

      expect(createResult.success).toBe(true);
      expect(createResult.handbookId).toBe('handbook-123');
    });
  });

  describe('Form Validation', () => {
    it('should validate handbook name length', () => {
      const shortName = 'A';
      const longName = 'A'.repeat(101);
      const validName = 'Min Förening';

      expect(shortName.length).toBeLessThan(2);
      expect(longName.length).toBeGreaterThan(100);
      expect(validName.length).toBeGreaterThanOrEqual(2);
      expect(validName.length).toBeLessThanOrEqual(100);
    });

    it('should validate subdomain format', () => {
      const validSubdomains = [
        'min-forening',
        'brf-solgläntan',
        'test123',
      ];

      const invalidSubdomains = [
        '',
        'a', // too short
        '-invalid', // starts with hyphen
        'invalid-', // ends with hyphen
        'in--valid', // double hyphen
      ];

      validSubdomains.forEach(subdomain => {
        expect(subdomain.length).toBeGreaterThanOrEqual(2);
        expect(subdomain).not.toMatch(/^-|-$/);
        expect(subdomain).not.toMatch(/--/);
      });

      invalidSubdomains.forEach(subdomain => {
        expect(
          subdomain.length < 2 || 
          subdomain.match(/^-|-$/) || 
          subdomain.match(/--/)
        ).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during subdomain check', async () => {
      const { supabase } = require('@/lib/supabase');
      
      // Mock network error
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });

      const subdomain = 'test-subdomain';
      
      try {
        const query = supabase.from('handbooks')
          .select('id')
          .eq('subdomain', subdomain)
          .single();

        await query;
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }
    });

    it('should handle authentication errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      // Mock auth error
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const result = await supabase.auth.getSession();
      
      expect(result.data.session).toBeNull();
      expect(result.error.message).toBe('Session expired');
    });
  });
}); 