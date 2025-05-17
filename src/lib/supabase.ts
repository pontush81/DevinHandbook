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

// Validera konfigurations-input
if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL saknas i miljövariabler');
}
if (!supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY saknas i miljövariabler');
}
if (!supabaseServiceRoleKey && typeof window === 'undefined') {
  console.error('SUPABASE_SERVICE_ROLE_KEY saknas i miljövariabler (endast server-side)');
}

// Skapa basklassen för anonym klient
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined'
    },
    global: {
      fetch: (...args) => {
        return fetch(...args);
      }
    }
  }
);

// Skapa admin-klienten för server-side operationer
let supabaseAdminClient: SupabaseClient | null = null;

// Funktion som skapar eller returnerar admin-klienten on-demand
export const getServiceSupabase = () => {
  // Endast skapa admin-klienten om vi är på server-sidan
  if (typeof window === 'undefined') {
    if (!supabaseAdminClient && supabaseServiceRoleKey) {
      try {
        supabaseAdminClient = createClient(
          supabaseUrl,
          supabaseServiceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            },
            global: {
              fetch: (...args) => {
                return fetch(...args);
              }
            }
          }
        );
      } catch (error) {
        console.error('Error creating Supabase admin client:', error);
        // Fallback till anonym klient om admin-klienten inte kunde skapas
        return supabase;
      }
    }
    
    // Om service-klienten existerar, returnera den, annars anonym klient
    return supabaseAdminClient || supabase;
  } else {
    // På klientsidan, returnera alltid den anonyma klienten
    return supabase;
  }
};

// Exportera admin-klienten för enklare användning
export const supabaseAdmin = getServiceSupabase();

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
