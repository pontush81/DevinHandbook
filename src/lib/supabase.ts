import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure SUPABASE_URL has https:// prefix
const ensureHttpsPrefix = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;
};

const supabaseUrl = ensureHttpsPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

let supabaseAdminClient: SupabaseClient | null = null;
try {
  if (typeof window === 'undefined' && supabaseServiceRoleKey) {
    supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
} catch (error) {
  console.error('Error creating Supabase admin client:', error);
}

export const supabaseAdmin = supabaseAdminClient || supabase;

export const getServiceSupabase = () => {
  if (!supabaseAdminClient) {
    console.warn('Service role key not available, using anonymous client instead');
  }
  return supabaseAdminClient || supabase;
};
export type Database = {
  public: {
    Tables: {
      handbooks: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          subdomain: string;
          user_id: string | null;
          published: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          subdomain: string;
          user_id?: string | null;
          published?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          subdomain?: string;
          user_id?: string | null;
          published?: boolean;
        };
      };
      sections: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string;
          order: number;
          handbook_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description: string;
          order: number;
          handbook_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          description?: string;
          order?: number;
          handbook_id?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          content: string;
          order: number;
          section_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          content: string;
          order: number;
          section_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          content?: string;
          order?: number;
          section_id?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          file_path: string;
          handbook_id: string;
          section_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          file_path: string;
          handbook_id: string;
          section_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          file_path?: string;
          handbook_id?: string;
          section_id?: string | null;
        };
      };
    };
  };
};
