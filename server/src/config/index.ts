import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  supabase: {
    url: process.env.SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_c3Q0NhLc1AfTXfTIShspxQ_rtW0m7KH',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  databaseUrl: process.env.DATABASE_URL || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'mr_iccf_enterprise_jwt_secret_key_2026_secure',
    accessExpiresIn: '30s', // EXACTLY 30 SECONDS application access JWT
    refreshExpiresInDays: 7, // 7 days refresh session lifetime
    issuer: 'mru-skillcert',
    audience: 'mru-api',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'mr_iccf_cookie_secret_2026_super_secure',
    refreshCookieName: 'mru_refresh_token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    models: [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-coder-32b-instruct:free',
      'mistralai/mistral-small-24b-instruct-2501:free',
      'meta-llama/llama-3.1-8b-instruct:free',
    ],
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173')
      .split(',')
      .map((s) => s.trim()),
  },

  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin.iccf@mru.edu.in',
  
  // Scoring parameters adhering to COMPLETE_DOCUMENTATION.md & Master Copy docx
  scoring: {
    certificationThreshold: 65.0, // 65.00% minimum passing and certificate eligibility requirement
  }
};
