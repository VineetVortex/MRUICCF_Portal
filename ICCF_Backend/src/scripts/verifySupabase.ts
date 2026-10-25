import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c3Q0NhLc1AfTXfTIShspxQ_rtW0m7KH';

console.log('----------------------------------------------------');
console.log('Testing Supabase Connection:');
console.log('URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey.substring(0, 15) + '...');
console.log('----------------------------------------------------');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const tables = ['departments', 'competencies', 'assessments', 'questions', 'attempts', 'users', 'audit_logs'];
  
  for (const table of tables) {
    try {
      const { data, error, status, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(2);

      if (error) {
        console.log(`[TABLE: ${table}] ❌ Error (Status ${status}):`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`[TABLE: ${table}] ✅ Connected! Rows found: ${count !== null ? count : data?.length}, Samples:`, data?.length);
      }
    } catch (e: any) {
      console.log(`[TABLE: ${table}] ❌ Exception:`, e.message);
    }
  }

  // Test inserting a test probe into audit_logs or attempts if table exists
  console.log('\n--- Testing write permission ---');
  try {
    const probeId = `probe-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('audit_logs')
      .insert([{
        id: probeId,
        category: 'SYSTEM',
        action: 'SUPABASE_CONNECTIVITY_PROBE',
        user_id: 'verifier@mru.edu.in',
        metadata: { probe: true, timestamp: new Date().toISOString() }
      }])
      .select();

    if (insertError) {
      console.log('Write Test: ❌ Insert failed:', insertError.message, `(Code: ${insertError.code})`);
    } else {
      console.log('Write Test: ✅ Insert succeeded! Created row:', insertData);
      
      // Clean up test probe
      const { error: delError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('id', probeId);
      
      if (delError) {
        console.log('Write Cleanup: ⚠️ Delete failed:', delError.message);
      } else {
        console.log('Write Cleanup: ✅ Deleted test probe successfully!');
      }
    }
  } catch (e: any) {
    console.log('Write Test: ❌ Exception:', e.message);
  }
}

verify().catch(console.error);
