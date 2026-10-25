import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Supabase client instance
let supabaseClient: SupabaseClient | null = null;

if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
  const keyToUse = config.supabase.serviceRoleKey || config.supabase.anonKey;
  try {
    supabaseClient = createClient(config.supabase.url, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
    });
    console.log(`[Database] Supabase client initialized with URL: ${config.supabase.url}`);
  } catch (err) {
    console.error('[Database] Failed to initialize Supabase client:', err);
  }
}

// PostgreSQL connection pool (optional, if migrating away from Supabase or using connection pooler)
let pgPool: pg.Pool | null = null;

if (config.databaseUrl) {
  try {
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      max: 20, // Max clients in pool (handles thousands of concurrent queries)
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    console.log('[Database] Direct PostgreSQL connection pool configured.');
  } catch (err) {
    console.error('[Database] Failed to initialize PostgreSQL pool:', err);
  }
}

export function getDb(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Database client not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  }
  return supabaseClient;
}

export function getPgPool(): pg.Pool | null {
  return pgPool;
}

/**
 * Health check for database connectivity
 */
export async function testDbConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    if (pgPool) {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      return { connected: true, message: 'Direct PostgreSQL connection successful.' };
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('departments').select('count', { count: 'exact', head: true });
      if (error && error.code !== '42P01') {
        return { connected: false, message: `Supabase error: ${error.message}` };
      }
      return { connected: true, message: 'Supabase connection verified.' };
    }

    return { connected: false, message: 'No database credentials configured.' };
  } catch (error: any) {
    return { connected: false, message: error.message || 'Database connection failed.' };
  }
}
