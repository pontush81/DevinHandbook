/**
 * @jest-environment node
 */

// Mock Next.js server components first
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: any, init?: any) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data)
    }))
  }
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn().mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'test-path' }, 
          error: null 
        }),
        getPublicUrl: jest.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/test-image.jpg' } 
        })
      })
    }
  })
}));

// Mock auth utils
jest.mock('@/lib/auth-utils', () => ({
  getServerSession: jest.fn(),
  isHandbookAdmin: jest.fn()
}));

import { POST } from '@/app/api/upload-image/route';
import { getServerSession, isHandbookAdmin } from '@/lib/auth-utils';

describe('/api/upload-image', () => {
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      formData: jest.fn()
    };
    
    // Default: user is authenticated and is admin
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-123' }
    });
    (isHandbookAdmin as jest.Mock).mockResolvedValue(true);
  });

  it('should return error for unauthenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const file = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024
    };
    
    const formData = new Map([
      ['image', file],
      ['handbook_id', 'test-handbook-123']
    ]);
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(0);
    expect(data.message).toBe('Authentication required');
  });

  it('should return error for non-admin user', async () => {
    (isHandbookAdmin as jest.Mock).mockResolvedValue(false);
    
    const file = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024
    };
    
    const formData = new Map([
      ['image', file],
      ['handbook_id', 'test-handbook-123']
    ]);
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(0);
    expect(data.message).toBe('Admin permissions required for file upload');
  });

  it('should return error for missing image', async () => {
    const formData = new Map();
    formData.set('handbook_id', 'test-handbook-123');
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(0);
    expect(data.message).toBe('No image provided');
  });

  it('should return error for missing handbook_id', async () => {
    const file = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024
    };
    
    const formData = new Map([['image', file]]);
    // No handbook_id provided
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(0);
    expect(data.message).toBe('Handbook ID is required for security');
  });

  it('should return error for invalid file type', async () => {
    const file = {
      name: 'test.txt',
      type: 'text/plain',
      size: 1000
    };
    
    const formData = new Map([
      ['image', file],
      ['handbook_id', 'test-handbook-123']
    ]);
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(0);
    expect(data.message).toContain('Invalid file type');
  });

  it('should return error for file too large', async () => {
    const file = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 6 * 1024 * 1024 // 6MB, over the 5MB limit
    };
    
    const formData = new Map([
      ['image', file],
      ['handbook_id', 'test-handbook-123']
    ]);
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(0);
    expect(data.message).toContain('File too large');
  });

  it('should successfully upload valid image for admin user', async () => {
    const file = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024 * 1024 // 1MB
    };
    
    const formData = new Map([
      ['image', file],
      ['handbook_id', 'test-handbook-123']
    ]);
    mockRequest.formData.mockResolvedValue(formData);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(1);
    expect(data.file.url).toBe('https://example.com/test-image.jpg');
    expect(data.file.name).toBe('test.jpg');
    expect(data.file.type).toBe('image/jpeg');
    
    // Verify admin check was called
    expect(isHandbookAdmin).toHaveBeenCalledWith('test-user-123', 'test-handbook-123');
  });
}); 