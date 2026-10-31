import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_c3Q0NhLc1AfTXfTIShspxQ_rtW0m7KH';

console.log('--- SUPABASE AUDIT ---');
console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  const tables = [
    'departments',
    'competencies',
    'questions',
    'assessments',
    'attempts',
    'assessment_attempts',
    'certificates',
    'audit_logs',
    'refresh_sessions',
    'users',
    'profiles',
    'question_versions'
  ];

  console.log('\n--- TABLE COUNTS ---');
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table [${table}]: ❌ ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`Table [${table}]: ✅ ${count} rows`);
      }
    } catch (e: any) {
      console.log(`Table [${table}]: ❌ Exception ${e.message}`);
    }
  }

  // Inspect competencies
  console.log('\n--- COMPETENCIES SAMPLE & BREAKDOWN ---');
  const { data: compData, error: compErr } = await supabase
    .from('competencies')
    .select('*')
    .order('id');
  if (compErr) {
    console.log('Error fetching competencies:', compErr.message);
  } else {
    console.log(`Found ${compData?.length} competencies:`);
    compData?.forEach((c: any, i: number) => {
      console.log(`  ${i + 1}. [ID: ${c.id}] ${c.name} (Code: ${c.code || c.slug || 'N/A'}, Category: ${c.category || 'N/A'})`);
    });
  }

  // Inspect questions per competency
  console.log('\n--- QUESTIONS SAMPLE & BREAKDOWN ---');
  const { data: qData, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .limit(5);
  if (qErr) {
    console.log('Error fetching questions:', qErr.message);
  } else {
    console.log(`Sample questions fields:`, Object.keys(qData?.[0] || {}));
    qData?.forEach((q: any) => {
      console.log(`  ID: ${q.id} | Comp: ${q.competency_id} | Reverse: ${q.is_reverse} | Text: ${(q.question_text || q.text || '').substring(0, 50)}...`);
    });
  }

  // Count reverse questions vs standard questions
  const { count: revCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_reverse', true);
  console.log(`\nReverse-scored questions count: ${revCount}`);
}

runAudit().catch(console.error);
