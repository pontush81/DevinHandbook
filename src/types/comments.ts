/**
 * TypeScript-typer för forum-systemet
 */

export interface ForumCategory {
  id: string;
  created_at: string;
  updated_at: string;
  
  handbook_id: string;
  name: string;
  description?: string;
  order_index: number;
  icon: string;
  
  // Status
  is_active: boolean;
  
  // Statistik
  topic_count: number;
  post_count: number;
  last_activity_at?: string;
}

export interface ForumTopic {
  id: string;
  created_at: string;
  updated_at: string;
  
  handbook_id: string;
  category_id: string;
  
  // Topic-innehåll
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_email?: string;
  
  // Status
  is_published: boolean;
  is_pinned: boolean;
  is_locked: boolean;
  is_flagged: boolean;
  
  // Statistik
  reply_count: number;
  view_count: number;
  last_reply_at?: string;
  last_reply_by?: string;
  last_reply_by_name?: string;
  
  // Moderation
  moderated_by?: string;
  moderated_at?: string;
  
  // Relaterade data
  category?: ForumCategory;
  posts?: ForumPost[];
}

export interface ForumPost {
  id: string;
  created_at: string;
  updated_at: string;
  
  handbook_id: string;
  topic_id: string;
  
  // Post-innehåll
  content: string;
  author_id: string;
  author_name: string;
  author_email?: string;
  
  // Referens
  reply_to_post_id?: string;
  
  // Status
  is_published: boolean;
  is_flagged: boolean;
  
  // Moderation
  moderated_by?: string;
  moderated_at?: string;
  
  // Relaterade data
  topic?: ForumTopic;
  reply_to_post?: ForumPost;
}

export interface ForumTopicFormData {
  title: string;
  content: string;
  category_id: string;
  is_pinned?: boolean;
}

export interface ForumPostFormData {
  content: string;
  reply_to_post_id?: string;
}

export interface ForumNotification {
  id: string;
  created_at: string;
  recipient_id: string;
  
  topic_id?: string;
  post_id?: string;
  
  notification_type: 'new_topic' | 'new_reply' | 'topic_locked' | 'post_flagged';
  
  is_read: boolean;
  read_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  
  // Relaterade data
  topic?: ForumTopic;
  post?: ForumPost;
}

export interface ForumStats {
  total_categories: number;
  total_topics: number;
  total_posts: number;
  active_topics: number;
  recent_activity: number;
  flagged_content: number;
}

export interface ForumFilters {
  category_id?: string;
  author_id?: string;
  is_pinned?: boolean;
  is_flagged?: boolean;
  is_published?: boolean;
  search_term?: string;
  order_by?: 'created_at' | 'last_reply_at' | 'reply_count' | 'view_count';
  order_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ForumModerationAction {
  action: 'approve' | 'flag' | 'unpublish' | 'lock' | 'pin' | 'delete';
  reason?: string;
  moderator_note?: string;
}

export interface ForumCategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  order_index?: number;
} 