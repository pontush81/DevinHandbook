import { getAdminClient } from './supabase';

// Export the admin client for use in server-side operations
export const supabaseAdmin = getAdminClient(); 