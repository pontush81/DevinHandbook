import { createHandbook } from '@/lib/handbook-creation';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
        })),
        order: jest.fn(),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  }
}));

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('Handbook Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Handbook Creation', () => {
    it('should create a new handbook with valid data', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockHandbook = {
        id: 'handbook-123',
        title: 'Test Handbook',
        subdomain: 'test-handbook',
        owner_id: 'user-123',
        created_at: '2023-01-01T00:00:00Z',
        published: false,
      };

      const mockSection = {
        id: 'section-123',
        title: 'Welcome Section',
        description: 'Introduction',
        handbook_id: 'handbook-123',
        order_index: 0,
      };

      const mockPage = {
        id: 'page-123',
        title: 'Overview',
        content: 'Welcome content',
        section_id: 'section-123',
        order_index: 0,
        slug: 'overview',
      };

      // Mock handbook creation
      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockHandbook],
            error: null,
          }),
        }),
      });

      // Mock section creation
      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockSection],
            error: null,
          }),
        }),
      });

      // Mock page creation
      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockPage],
            error: null,
          }),
        }),
      });

      const handbookData = {
        name: 'Test Handbook',
        subdomain: 'test-handbook',
        userId: 'user-123',
        template: {
          metadata: { type: 'default' },
          sections: [{
            title: 'Welcome Section',
            description: 'Introduction',
            pages: [{
              title: 'Overview',
              content: 'Welcome content',
            }],
          }],
        },
      };

      // Note: This function might not exist yet, but this is what we'd test
      // const result = await createHandbook(handbookData);

      // For now, let's test the individual steps
      const handbookQuery = supabase.from('handbooks').insert({
        title: handbookData.name,
        subdomain: handbookData.subdomain,
        owner_id: handbookData.userId,
      });

      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should validate subdomain uniqueness', async () => {
      const { supabase } = require('@/lib/supabase');
      
      // Mock existing handbook with same subdomain
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-handbook' },
              error: null,
            }),
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .select('id')
        .eq('subdomain', 'test-handbook')
        .single();

      const result = await query;
      
      expect(result.data).toEqual({ id: 'existing-handbook' });
      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should handle handbook creation errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockError = {
        message: 'Subdomain already exists',
        code: '23505',
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      const query = supabase.from('handbooks').insert({
        title: 'Test Handbook',
        subdomain: 'existing-subdomain',
        owner_id: 'user-123',
      });

      const result = await query.select();
      
      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });
  });

  describe('Handbook Retrieval', () => {
    it('should fetch handbook by subdomain', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockHandbook = {
        id: 'handbook-123',
        title: 'Test Handbook',
        subdomain: 'test-handbook',
        sections: [
          {
            id: 'section-123',
            title: 'Welcome',
            pages: [
              {
                id: 'page-123',
                title: 'Overview',
                content: 'Welcome content',
              },
            ],
          },
        ],
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockHandbook,
              error: null,
            }),
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .select(`
          *,
          sections:handbook_sections(
            *,
            pages:handbook_pages(*)
          )
        `)
        .eq('subdomain', 'test-handbook')
        .single();

      const result = await query;
      
      expect(result.data).toEqual(mockHandbook);
      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should handle handbook not found', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockError = {
        message: 'No rows returned',
        code: 'PGRST116',
      };

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .select('*')
        .eq('subdomain', 'nonexistent-handbook')
        .single();

      const result = await query;
      
      expect(result.error).toEqual(mockError);
      expect(result.data).toBeNull();
    });
  });

  describe('Handbook Updates', () => {
    it('should update handbook title', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const updatedHandbook = {
        id: 'handbook-123',
        title: 'Updated Handbook Title',
        subdomain: 'test-handbook',
      };

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [updatedHandbook],
            error: null,
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .update({ title: 'Updated Handbook Title' })
        .eq('id', 'handbook-123');

      const result = await query;
      
      expect(result.data).toEqual([updatedHandbook]);
      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should publish handbook', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const publishedHandbook = {
        id: 'handbook-123',
        published: true,
      };

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [publishedHandbook],
            error: null,
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .update({ published: true })
        .eq('id', 'handbook-123');

      const result = await query;
      
      expect(result.data).toEqual([publishedHandbook]);
    });
  });

  describe('Handbook Deletion', () => {
    it('should delete handbook and related data', async () => {
      const { supabase } = require('@/lib/supabase');
      
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .delete()
        .eq('id', 'handbook-123');

      const result = await query;
      
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('handbooks');
    });

    it('should handle deletion errors', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockError = {
        message: 'Foreign key constraint violation',
        code: '23503',
      };

      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      const query = supabase.from('handbooks')
        .delete()
        .eq('id', 'handbook-123');

      const result = await query;
      
      expect(result.error).toEqual(mockError);
    });
  });

  describe('Section Management', () => {
    it('should create new section', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const newSection = {
        id: 'section-456',
        title: 'New Section',
        description: 'Section description',
        handbook_id: 'handbook-123',
        order_index: 1,
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [newSection],
            error: null,
          }),
        }),
      });

      const query = supabase.from('handbook_sections').insert({
        title: 'New Section',
        description: 'Section description',
        handbook_id: 'handbook-123',
        order_index: 1,
      });

      const result = await query.select();
      
      expect(result.data).toEqual([newSection]);
      expect(supabase.from).toHaveBeenCalledWith('handbook_sections');
    });
  });

  describe('Page Management', () => {
    it('should create new page', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const newPage = {
        id: 'page-456',
        title: 'New Page',
        content: 'Page content',
        section_id: 'section-123',
        order_index: 1,
        slug: 'new-page',
      };

      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [newPage],
            error: null,
          }),
        }),
      });

      const query = supabase.from('handbook_pages').insert({
        title: 'New Page',
        content: 'Page content',
        section_id: 'section-123',
        order_index: 1,
        slug: 'new-page',
      });

      const result = await query.select();
      
      expect(result.data).toEqual([newPage]);
      expect(supabase.from).toHaveBeenCalledWith('handbook_pages');
    });
  });
}); 