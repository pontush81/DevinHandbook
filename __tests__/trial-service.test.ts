import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  getTrialStatus, 
  startUserTrial, 
  isEligibleForTrial, 
  formatTrialEndDate, 
  isTrialExpired, 
  getTrialDaysRemaining 
} from '../src/lib/trial-service';

// Mock Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      insert: jest.fn()
    }))
  }
}));

describe('Trial Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrialStatus', () => {
    it('should return trial status for user in active trial', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      // Mock RPC call for trial status
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          is_in_trial: true,
          trial_days_remaining: 25,
          subscription_status: 'trial',
          trial_ends_at: '2024-02-01T12:00:00Z'
        }],
        error: null
      });

      // Mock handbooks query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: [{ id: '1', created_during_trial: true }],
            error: null
          })
        })
      });

      const result = await getTrialStatus('user-123');

      expect(result).toEqual({
        isInTrial: true,
        trialDaysRemaining: 25,
        subscriptionStatus: 'trial',
        trialEndsAt: '2024-02-01T12:00:00Z',
        canCreateHandbook: true,
        hasUsedTrial: true
      });
    });

    it('should handle user with no trial', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          is_in_trial: false,
          trial_days_remaining: 0,
          subscription_status: 'none',
          trial_ends_at: null
        }],
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: [],
            error: null
          })
        })
      });

      const result = await getTrialStatus('user-123');

      expect(result.isInTrial).toBe(false);
      expect(result.subscriptionStatus).toBe('none');
      expect(result.hasUsedTrial).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getTrialStatus('user-123');

      expect(result).toEqual({
        isInTrial: false,
        trialDaysRemaining: 0,
        subscriptionStatus: 'none',
        trialEndsAt: null,
        canCreateHandbook: true,
        hasUsedTrial: false
      });
    });
  });

  describe('isEligibleForTrial', () => {
    it('should return true for new user with no profile', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: { code: 'PGRST116' } // No rows found
            })
          })
        })
      });

      const result = await isEligibleForTrial('user-123');
      expect(result).toBe(true);
    });

    it('should return true for user who has not used trial', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                trial_used: false,
                total_handbooks_created: 0
              },
              error: null
            })
          })
        })
      });

      const result = await isEligibleForTrial('user-123');
      expect(result).toBe(true);
    });

    it('should return false for user who has already used trial', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                trial_used: true,
                total_handbooks_created: 1
              },
              error: null
            })
          })
        })
      });

      const result = await isEligibleForTrial('user-123');
      expect(result).toBe(false);
    });
  });

  describe('startUserTrial', () => {
    it('should start trial for eligible user', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      const mockProfile = {
        id: 'user-123',
        trial_started_at: '2024-01-01T12:00:00Z',
        trial_ends_at: '2024-01-31T12:00:00Z',
        trial_used: true,
        subscription_status: 'trial'
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockProfile,
        error: null
      });

      const result = await startUserTrial('user-123', 'user@example.com');
      
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_user_trial', {
        user_id: 'user-123',
        user_email: 'user@example.com'
      });
    });

    it('should handle errors when starting trial', async () => {
      const mockSupabase = require('../src/lib/supabase').supabase;
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to start trial' }
      });

      await expect(startUserTrial('user-123', 'user@example.com')).rejects.toThrow();
    });
  });

  describe('Utility functions', () => {
    describe('formatTrialEndDate', () => {
      it('should format date correctly', () => {
        const date = '2024-01-31T12:00:00Z';
        const result = formatTrialEndDate(date);
        
        // Should return a formatted Swedish date
        expect(result).toMatch(/\d{4}/); // Should contain year
        expect(result).toMatch(/\d{2}:\d{2}/); // Should contain time
      });

      it('should return empty string for null date', () => {
        const result = formatTrialEndDate(null);
        expect(result).toBe('');
      });
    });

    describe('isTrialExpired', () => {
      it('should return true for past date', () => {
        const pastDate = '2020-01-01T12:00:00Z';
        const result = isTrialExpired(pastDate);
        expect(result).toBe(true);
      });

      it('should return false for future date', () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const result = isTrialExpired(futureDate);
        expect(result).toBe(false);
      });

      it('should return false for null date', () => {
        const result = isTrialExpired(null);
        expect(result).toBe(false);
      });
    });

    describe('getTrialDaysRemaining', () => {
      it('should calculate days remaining correctly', () => {
        const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const result = getTrialDaysRemaining(futureDate);
        expect(result).toBe(5);
      });

      it('should return 0 for past dates', () => {
        const pastDate = '2020-01-01T12:00:00Z';
        const result = getTrialDaysRemaining(pastDate);
        expect(result).toBe(0);
      });

      it('should return 0 for null date', () => {
        const result = getTrialDaysRemaining(null);
        expect(result).toBe(0);
      });
    });
  });
}); 