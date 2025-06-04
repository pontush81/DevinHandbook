/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/upload-document/route';

// Mock Supabase
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getServiceSupabase: jest.fn().mockReturnValue({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

// Mock auth utils
jest.mock('@/lib/auth-utils', () => ({
  getServerSession: jest.fn(),
  isHandbookAdmin: jest.fn()
}));

import { getServerSession, isHandbookAdmin } from '@/lib/auth-utils';

describe('/api/upload-document', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: user is authenticated and is admin
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'test-user-123' }
    });
    (isHandbookAdmin as jest.Mock).mockResolvedValue(true);
  });

  it('should return error for unauthenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const pdfContent = Buffer.from('PDF content');
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.success).toBe(0);
    expect(result.message).toBe('Authentication required');
  });

  it('should return error for non-admin user', async () => {
    (isHandbookAdmin as jest.Mock).mockResolvedValue(false);
    
    const pdfContent = Buffer.from('PDF content');
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.success).toBe(0);
    expect(result.message).toBe('Admin permissions required for file upload');
  });

  it('should upload a valid PDF document successfully', async () => {
    const pdfContent = Buffer.from('PDF content');
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    mockUpload.mockResolvedValue({ data: { path: 'test-handbook-123/documents/test.pdf' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'http://example.com/test.pdf' } });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(1);
    expect(result.file.url).toBe('http://example.com/test.pdf');
    expect(result.file.name).toBe('test.pdf');
    expect(result.file.extension).toBe('pdf');
    
    // Verify admin check was called
    expect(isHandbookAdmin).toHaveBeenCalledWith('test-user-123', 'test-handbook-123');
  });

  it('should upload a valid Word document successfully', async () => {
    const docContent = Buffer.from('Word document content');
    const file = new File([docContent], 'document.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    mockUpload.mockResolvedValue({ data: { path: 'test-handbook-123/documents/document.docx' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'http://example.com/document.docx' } });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(1);
    expect(result.file.extension).toBe('docx');
  });

  it('should reject invalid file types', async () => {
    const invalidContent = Buffer.from('Invalid content');
    const file = new File([invalidContent], 'test.exe', { type: 'application/x-executable' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(0);
    expect(result.message).toContain('Invalid file type');
  });

  it('should reject files that are too large', async () => {
    // Create a file larger than 10MB
    const largeContent = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(0);
    expect(result.message).toContain('File too large');
  });

  it('should handle missing file', async () => {
    const formData = new FormData();
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(0);
    expect(result.message).toBe('No file provided');
  });

  it('should handle missing handbook_id', async () => {
    const pdfContent = Buffer.from('PDF content');
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    // No handbook_id provided

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(0);
    expect(result.message).toBe('Handbook ID is required for security');
  });

  it('should handle Supabase upload errors', async () => {
    const pdfContent = Buffer.from('PDF content');
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('handbook_id', 'test-handbook-123');

    const request = new NextRequest('http://localhost:3000/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    mockUpload.mockResolvedValue({ data: null, error: { message: 'Storage error' } });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.success).toBe(0);
    expect(result.message).toBe('Failed to upload document');
  });

  it('should accept various valid document types for admin user', async () => {
    const validTypes = [
      { name: 'test.pdf', type: 'application/pdf' },
      { name: 'test.doc', type: 'application/msword' },
      { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { name: 'test.xls', type: 'application/vnd.ms-excel' },
      { name: 'test.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { name: 'test.ppt', type: 'application/vnd.ms-powerpoint' },
      { name: 'test.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'test.txt', type: 'text/plain' },
      { name: 'test.csv', type: 'text/csv' },
    ];

    for (const fileType of validTypes) {
      const content = Buffer.from('Test content');
      const file = new File([content], fileType.name, { type: fileType.type });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('handbook_id', 'test-handbook-123');

      const request = new NextRequest('http://localhost:3000/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      mockUpload.mockResolvedValue({ data: { path: `test-handbook-123/documents/${fileType.name}` }, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: `http://example.com/${fileType.name}` } });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(1);
      expect(result.file.name).toBe(fileType.name);
    }
  });
}); 