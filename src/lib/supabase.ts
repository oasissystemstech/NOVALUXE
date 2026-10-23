import { createClient } from '@supabase/supabase-js';

// Supplied Supabase Credentials
const DEFAULT_SUPABASE_URL = 'https://srclselecvagahijkonu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyY2xzZWxlY3ZhZ2FoaWprb251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzY1NTQsImV4cCI6MjEwODM1MjU1NH0.8kM87krmxlRCNQcihEc5OgmVwNGtuTdgegzyokwgskQ';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Sanitize URL in case /rest/v1/ was provided in the input string
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey = rawKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

// Helper to test connectivity
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client is not initialized.' };
  }
  try {
    const { error } = await supabase.from('site_settings').select('count', { count: 'exact', head: true });
    if (error) {
      // Table might not exist yet if migration hasn't been executed
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! (Database tables need to be created using the SQL script).'
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Connected and synchronized with Supabase!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}
