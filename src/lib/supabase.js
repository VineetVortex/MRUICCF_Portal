import { createClient } from '@supabase/supabase-js';

// Read from Vite environment variables or dynamic localStorage fallback
const STORAGE_KEY_URL = 'mr_supabase_url';
const STORAGE_KEY_KEY = 'mr_supabase_anon_key';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_URL) || '') : '';
  const localKey = typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY_KEY) || '') : '';

  const url = (localUrl || envUrl).trim();
  const anonKey = (localKey || envKey).trim();

  return { url, anonKey };
}

export function saveSupabaseCredentials(url, anonKey) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

// Client singleton instance
let clientInstance = null;
let currentConfiguredUrl = '';
let currentConfiguredKey = '';

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  if (clientInstance && currentConfiguredUrl === url && currentConfiguredKey === anonKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    currentConfiguredUrl = url;
    currentConfiguredKey = anonKey;
    return clientInstance;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase URL or Anon Key is missing.' };
  }

  try {
    // Attempt a light ping by querying questions or schema info
    const { data, error } = await client.from('questions').select('count', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet, but authentication reached Supabase
      if (error.code === '42P01') {
        return { 
          success: true, 
          tableMissing: true, 
          message: 'Connected to Supabase project! (Tables not yet created - run the provided SQL script to create tables).' 
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (e) {
    return { success: false, message: e.message || 'Connection failed' };
  }
}
