import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { pathToFileURL } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_c3Q0NhLc1AfTXfTIShspxQ_rtW0m7KH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEPARTMENTS = [
  { id: 'dept_cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept_ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept_me', name: 'Mechanical Engineering', code: 'ME' },
  { id: 'dept_mgt', name: 'School of Management & Commerce', code: 'SMC' },
  { id: 'dept_app', name: 'Applied Sciences & Humanities', code: 'ASH' },
];

const COMPETENCIES = [
  { id: 1, name: 'Communication', description: 'Articulates technical and interpersonal ideas with clarity and stakeholder empathy.', univ_avg: 74 },
  { id: 2, name: 'Active Listening', description: 'Listens attentively without interrupting, assimilating feedback productively.', univ_avg: 71 },
  { id: 3, name: 'Teamwork & Collaboration', description: 'Cooperates effectively across cross-functional groups towards shared project milestones.', univ_avg: 75 },
  { id: 4, name: 'Empathy', description: 'Demonstrates situational awareness and sensitivity toward diverse team perspectives.', univ_avg: 70 },
  { id: 5, name: 'Adaptability', description: 'Navigates shifting requirements, novel frameworks, and uncertain engineering parameters.', univ_avg: 73 },
  { id: 6, name: 'Problem-Solving & Critical Thinking', description: 'Deconstructs complex constraints into structured, evidence-based solutions.', univ_avg: 76 },
  { id: 7, name: 'Conflict Resolution & Negotiation', description: 'Mediates interpersonal friction constructively to reach mutually agreeable compromises.', univ_avg: 68 },
  { id: 8, name: 'Self-Awareness', description: 'Recognizes personal limitations, emotional triggers, and cognitive blindspots.', univ_avg: 72 },
  { id: 9, name: 'Emotional Regulation', description: 'Maintains composure, focus, and constructive demeanor under acute pressure.', univ_avg: 69 },
  { id: 10, name: 'Stress Management', description: 'Applies proactive resilience strategies to prevent burnout in high-demand environments.', univ_avg: 67 },
  { id: 11, name: 'Ethics', description: 'Maintains uncompromising professional integrity and accountability.', univ_avg: 79 },
  { id: 12, name: 'Integrity', description: 'Upholds commitments, transparency, and academic rigor in all collaborative contexts.', univ_avg: 78 },
  { id: 13, name: 'Professional Etiquette', description: 'Adheres to high standards of workplace civility, promptness, and professional communication.', univ_avg: 74 },
  { id: 14, name: 'Time Management', description: 'Prioritizes workflows efficiently to meet academic and industry deadlines consistently.', univ_avg: 71 },
  { id: 15, name: 'Lifelong Learning', description: 'Actively acquires novel technical competencies and seeks continuous self-improvement.', univ_avg: 77 },
];

const ASSESSMENTS = [
  {
    id: 'asmt-standard-2026',
    name: 'Institutional Human-Centric Skills Assessment 2026',
    department: 'All Departments',
    time_limit: 45,
    questions_per_competency: 10,
    total_questions: 150,
    active: true,
    description: 'Official evaluation covering 15 core dimensions of human-centric and professional competencies.'
  },
  {
    id: 'asmt-tech-2026',
    name: 'Engineering Faculty & Core Team Evaluation',
    department: 'Computer Science & Engineering',
    time_limit: 45,
    questions_per_competency: 10,
    total_questions: 150,
    active: true,
    description: 'Specialized evaluation benchmarked for engineering disciplines.'
  }
];

async function seed() {
  console.log('================================================================');
  console.log('🚀 POPULATING SUPABASE WITH OFFICIAL INSTITUTIONAL DATA');
  console.log('================================================================');

  // 1. Seed Departments
  console.log('1. Inserting departments...');
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .insert(DEPARTMENTS)
    .select();
  if (deptError) console.error('  ❌ Error:', deptError.message);
  else console.log(`  ✅ Successfully seeded ${deptData.length} departments.`);

  // 2. Seed Competencies
  console.log('2. Inserting 15 competencies...');
  const { data: compData, error: compError } = await supabase
    .from('competencies')
    .insert(COMPETENCIES)
    .select();
  if (compError) console.error('  ❌ Error:', compError.message);
  else console.log(`  ✅ Successfully seeded ${compData.length} competencies.`);

  // 3. Seed Assessments
  console.log('3. Inserting assessments...');
  const { data: asmtData, error: asmtError } = await supabase
    .from('assessments')
    .upsert(ASSESSMENTS, { onConflict: 'id' })
    .select();
  if (asmtError) console.error('  ❌ Error:', asmtError.message);
  else console.log(`  ✅ Successfully seeded ${asmtData.length} assessments.`);

  // 4. Seed Questions from frontend data
  console.log('4. Extracting and inserting question bank from assessmentData.js...');
  const assessmentDataPath = path.resolve(process.cwd(), '../src/data/assessmentData.js');
  const fileUrl = pathToFileURL(assessmentDataPath).href;
  
  const fileContent = await import(fileUrl);
  const allQuestions = fileContent.ALL_QUESTIONS || [];
  
  if (allQuestions.length > 0) {
    const formattedQuestions = allQuestions.map((q: any) => ({
      id: Number(q.id),
      skill_id: Number(q.skillId),
      skill_name: q.skillName,
      text: q.text,
      is_reverse: Boolean(q.isReverse),
      difficulty: q.isReverse ? 'Intermediate' : 'Standard',
      approval_status: 'approved',
      created_by: 'Manav Rachna Skill Framework'
    }));

    console.log(`  Found ${formattedQuestions.length} official questions. Uploading to Supabase in batches...`);
    for (let i = 0; i < formattedQuestions.length; i += 50) {
      const batch = formattedQuestions.slice(i, i + 50);
      const { error: qError } = await supabase
        .from('questions')
        .upsert(batch, { onConflict: 'id' });
      
      if (qError) {
        console.error(`  ❌ Batch ${i} error:`, qError.message);
      } else {
        console.log(`  ✅ Uploaded questions ${i + 1} to ${Math.min(i + 50, formattedQuestions.length)}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL TABLES IN SUPABASE ARE NOW POPULATED WITH OFFICIAL DATA!');
  console.log('================================================================');
}

seed().catch(console.error);
