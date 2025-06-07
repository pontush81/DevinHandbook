import { POST as NotificationSend } from '@/app/api/notifications/send/route';
import { GET as PreferencesGet, PUT as PreferencesUpdate } from '@/app/api/notifications/preferences/route';
import { getServiceSupabase } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth-utils';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/auth-utils');

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body, options) => ({
      json: () => Promise.resolve(body),
      status: options?.status || 200
    }))
  }
}));

// Mock Resend constructor using a factory pattern
jest.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'email-id' } })
    },
    batch: {
      send: jest.fn().mockResolvedValue({ data: [{ id: 'email-id-1' }, { id: 'email-id-2' }] })
    }
  };
  
  return {
    Resend: jest.fn(() => mockInstance),
    __mockInstance: mockInstance // Export for test access
  };
});

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        order: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              in: jest.fn()
            }))
          })),
          is: jest.fn(() => ({
            in: jest.fn()
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
};

// Get reference to the mock instance
const { __mockInstance: mockResend } = require('resend');

describe('/api/notifications/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServiceSupabase as jest.Mock).mockReturnValue(mockSupabase);
    
    // Reset mock implementations
    mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' } });
    mockResend.batch.send.mockResolvedValue({ data: [{ id: 'email-id-1' }, { id: 'email-id-2' }] });
    
    // Setup environment variables
    process.env.SUPABASE_WEBHOOK_SECRET = 'test-secret';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_DOMAIN = 'test.com';
  });

  test('should require valid authentication', async () => {
    const request = new Request('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer invalid-secret'
      },
      body: JSON.stringify({
        type: 'new_topic',
        handbook_id: 'handbook-1',
        topic_id: 'topic-1',
        author_name: 'Test User',
        content_preview: 'Test content',
        title: 'Test Title'
      })
    });

    const response = await NotificationSend(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  test('should send single email for one recipient', async () => {
    // Mock database responses
    const mockHandbook = { name: 'Test Handbook', subdomain: 'test' };
    const mockTopic = { title: 'Test Topic', author_id: 'author-1' };
    const mockMembers = [
      {
        user_id: 'user-1',
        auth: { users: { email: 'user1@test.com' } },
        user_notification_preferences: [{ email_new_topics: true, app_new_topics: true }]
      }
    ];

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbooks') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockHandbook, error: null })
            })
          })
        };
      }
      if (table === 'forum_topics') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockTopic, error: null })
            })
          })
        };
      }
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null })
          })
        };
      }
      if (table === 'forum_notifications') {
        return {
          insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  in: jest.fn().mockResolvedValue({ data: {}, error: null })
                })
              })
            })
          })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer test-secret'
      },
      body: JSON.stringify({
        type: 'new_topic',
        handbook_id: 'handbook-1',
        topic_id: 'topic-1',
        author_name: 'Test Author',
        content_preview: 'Test content preview',
        title: 'Test Topic Title'
      })
    });

    const response = await NotificationSend(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBe(1);
    expect(data.skipped).toBe(0);
    expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    expect(mockResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Test Handbook <noreply@test.com>',
        to: 'user1@test.com',
        reply_to: 'no-reply@test.com',
        tags: [
          { name: 'type', value: 'new_topic' },
          { name: 'handbook', value: 'handbook-1' },
          { name: 'topic', value: 'topic-1' }
        ]
      })
    );
  });

  test('should use batch sending for multiple recipients', async () => {
    // Mock database responses for multiple recipients
    const mockHandbook = { name: 'Test Handbook', subdomain: 'test' };
    const mockTopic = { title: 'Test Topic', author_id: 'author-1' };
    const mockMembers = [
      {
        user_id: 'user-1',
        auth: { users: { email: 'user1@test.com' } },
        user_notification_preferences: [{ email_new_topics: true, app_new_topics: true }]
      },
      {
        user_id: 'user-2',
        auth: { users: { email: 'user2@test.com' } },
        user_notification_preferences: [{ email_new_topics: true, app_new_topics: true }]
      },
      {
        user_id: 'user-3',
        auth: { users: { email: 'user3@test.com' } },
        user_notification_preferences: [{ email_new_topics: false, app_new_topics: true }]
      }
    ];

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbooks') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockHandbook, error: null })
            })
          })
        };
      }
      if (table === 'forum_topics') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockTopic, error: null })
            })
          })
        };
      }
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null })
          })
        };
      }
      if (table === 'forum_notifications') {
        return {
          insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  in: jest.fn().mockResolvedValue({ data: {}, error: null })
                })
              })
            })
          })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer test-secret'
      },
      body: JSON.stringify({
        type: 'new_topic',
        handbook_id: 'handbook-1',
        topic_id: 'topic-1',
        author_name: 'Test Author',
        content_preview: 'Test content preview',
        title: 'Test Topic Title'
      })
    });

    const response = await NotificationSend(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBe(2); // Two emails sent
    expect(data.skipped).toBe(1); // One skipped due to preferences
    expect(mockResend.batch.send).toHaveBeenCalledTimes(1);
    expect(mockResend.batch.send).toHaveBeenCalledWith([
      expect.objectContaining({
        from: 'Test Handbook <noreply@test.com>',
        to: 'user1@test.com',
        reply_to: 'no-reply@test.com',
        tags: [
          { name: 'type', value: 'new_topic' },
          { name: 'handbook', value: 'handbook-1' },
          { name: 'topic', value: 'topic-1' }
        ]
      }),
      expect.objectContaining({
        from: 'Test Handbook <noreply@test.com>',
        to: 'user2@test.com',
        reply_to: 'no-reply@test.com',
        tags: [
          { name: 'type', value: 'new_topic' },
          { name: 'handbook', value: 'handbook-1' },
          { name: 'topic', value: 'topic-1' }
        ]
      })
    ]);
  });

  test('should handle no email recipients gracefully', async () => {
    // Mock database responses where no one wants emails
    const mockHandbook = { name: 'Test Handbook', subdomain: 'test' };
    const mockTopic = { title: 'Test Topic', author_id: 'author-1' };
    const mockMembers = [
      {
        user_id: 'user-1',
        auth: { users: { email: 'user1@test.com' } },
        user_notification_preferences: [{ email_new_topics: false, app_new_topics: true }]
      }
    ];

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbooks') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockHandbook, error: null })
            })
          })
        };
      }
      if (table === 'forum_topics') {
        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: mockTopic, error: null })
            })
          })
        };
      }
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null })
          })
        };
      }
      if (table === 'forum_notifications') {
        return {
          insert: jest.fn().mockResolvedValue({ data: {}, error: null })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer test-secret'
      },
      body: JSON.stringify({
        type: 'new_topic',
        handbook_id: 'handbook-1',
        topic_id: 'topic-1',
        author_name: 'Test Author',
        content_preview: 'Test content preview',
        title: 'Test Topic Title'
      })
    });

    const response = await NotificationSend(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBe(0);
    expect(data.skipped).toBe(1);
    expect(data.total).toBe(1);
    expect(mockResend.emails.send).not.toHaveBeenCalled();
    expect(mockResend.batch.send).not.toHaveBeenCalled();
  });

  test('should send new reply notifications to participants', async () => {
    // Mock database responses for reply scenario
    const mockHandbook = { name: 'Test Handbook', subdomain: 'test' };
    const mockTopic = { title: 'Test Topic', author_id: 'author-1' };
    const mockReply = { author_id: 'replier-1' };
    const mockParticipants = [{ author_id: 'participant-1' }];
    const mockMembers = [
      {
        user_id: 'author-1', // Topic author should receive notification
        auth: { users: { email: 'author@test.com' } },
        user_notification_preferences: [{ email_new_replies: true, app_new_replies: true }]
      },
      {
        user_id: 'participant-1', // Previous participant should receive notification
        auth: { users: { email: 'participant@test.com' } },
        user_notification_preferences: [{ email_new_replies: true, app_new_replies: true }]
      },
      {
        user_id: 'replier-1', // Current replier should NOT receive notification (will be filtered out)
        auth: { users: { email: 'replier@test.com' } },
        user_notification_preferences: [{ email_new_replies: true, app_new_replies: true }]
      }
    ];

    // Create a fresh mock for this test to avoid recursion
    const testMockSupabase = {
      from: jest.fn((table) => {
        if (table === 'handbooks') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: mockHandbook, error: null })
              })
            })
          };
        }
        if (table === 'forum_topics') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: mockTopic, error: null })
              })
            })
          };
        }
        if (table === 'forum_posts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((field, value) => {
                if (field === 'id' && value === 'post-1') {
                  // This is the query for the current reply author
                  return {
                    single: jest.fn().mockResolvedValue({ data: mockReply, error: null })
                  };
                } else if (field === 'topic_id' && value === 'topic-1') {
                  // This is the query for all participants in the topic
                  return Promise.resolve({ data: mockParticipants, error: null });
                }
                return {
                  single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
                };
              })
            }))
          };
        }
        if (table === 'handbook_members') {
          return {
            select: () => ({
              eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null })
            })
          };
        }
        if (table === 'forum_notifications') {
          return {
            insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    in: jest.fn().mockResolvedValue({ data: {}, error: null })
                  })
                })
              })
            })
          };
        }
        // Default fallback
        return {
          select: () => ({ eq: () => ({ single: jest.fn() }) }),
          insert: () => ({ select: () => ({ single: jest.fn() }) }),
          update: () => ({ eq: () => ({ eq: () => ({ is: () => ({ in: jest.fn() }) }) }) })
        };
      })
    };

    (getServiceSupabase as jest.Mock).mockReturnValue(testMockSupabase);

    const request = new Request('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer test-secret'
      },
      body: JSON.stringify({
        type: 'new_reply',
        handbook_id: 'handbook-1',
        topic_id: 'topic-1',
        post_id: 'post-1',
        author_name: 'Replier',
        content_preview: 'Test reply content'
      })
    });

    const response = await NotificationSend(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.sent).toBe(2); // Both author and participant should receive emails
  });
});

describe('/api/notifications/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServiceSupabase as jest.Mock).mockReturnValue(mockSupabase);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com' }
    });
  });

  test('should get user notification preferences', async () => {
    const mockMember = { id: 'member-1' };
    const mockPreferences = {
      id: 'pref-1',
      email_new_topics: true,
      email_new_replies: false,
      email_mentions: true,
      app_new_topics: true,
      app_new_replies: true,
      app_mentions: true
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: mockMember, error: null })
              })
            })
          })
        };
      }
      if (table === 'user_notification_preferences') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: mockPreferences, error: null })
              })
            })
          })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/preferences?handbook_id=handbook-1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await PreferencesGet(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preferences).toEqual(mockPreferences);
  });

  test('should update user notification preferences', async () => {
    const mockMember = { id: 'member-1' };
    const mockUpdatedPreferences = {
      id: 'pref-1',
      email_new_topics: false,
      email_new_replies: true,
      email_mentions: false,
      app_new_topics: true,
      app_new_replies: true,
      app_mentions: false
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: mockMember, error: null })
              })
            })
          })
        };
      }
      if (table === 'user_notification_preferences') {
        return {
          upsert: () => ({
            select: () => ({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedPreferences, error: null })
            })
          })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        handbook_id: 'handbook-1',
        email_new_topics: false,
        email_new_replies: true,
        email_mentions: false,
        app_new_topics: true,
        app_new_replies: true,
        app_mentions: false
      })
    });

    const response = await PreferencesUpdate(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.preferences).toEqual(mockUpdatedPreferences);
  });

  test('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/notifications/preferences?handbook_id=handbook-1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await PreferencesGet(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Du måste vara inloggad');
  });

  test('should require handbook access', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'handbook_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
              })
            })
          })
        };
      }
      return mockSupabase.from();
    });

    const request = new Request('http://localhost:3000/api/notifications/preferences?handbook_id=handbook-1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await PreferencesGet(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Du har inte behörighet till denna handbok');
  });
}); 