import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c3Q0NhLc1AfTXfTIShspxQ_rtW0m7KH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedFaculty() {
  console.log('================================================================');
  console.log('📚 SEEDING 226 MANAV RACHNA FACULTY INTO SUPABASE');
  console.log('================================================================');

  const jsonPath = path.resolve(process.cwd(), 'src/data/mruFacultyDirectory.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('File not found:', jsonPath);
    return;
  }

  const facultyList = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${facultyList.length} faculty from ${jsonPath}`);

  // Test inserting in chunks of 50
  let uploaded = 0;
  for (let i = 0; i < facultyList.length; i += 50) {
    const chunk = facultyList.slice(i, i + 50);
    const { data, error } = await supabase
      .from('faculty_directory')
      .upsert(chunk, { onConflict: 'email' });

    if (error) {
      console.warn(`  ⚠️ Batch ${i} notice:`, error.message);
    } else {
      uploaded += chunk.length;
      console.log(`  ✅ Synced batch ${i + 1} to ${Math.min(i + 50, facultyList.length)}`);
    }
  }

  console.log(`\n🎉 Completed! Synced ${uploaded}/${facultyList.length} faculty into Supabase faculty_directory.`);
}

seedFaculty().catch(console.error);
