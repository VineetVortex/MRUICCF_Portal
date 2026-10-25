import { getDb } from '../db/index.js';
import { BASELINE_COMPETENCIES, BASELINE_DEPARTMENTS } from '../controllers/competencyController.js';
import { BASELINE_ASSESSMENTS } from '../controllers/assessmentController.js';
import fs from 'fs';
import path from 'path';

export async function runDatabaseSeed() {
  console.log('[Seed] Starting Manav Rachna ICCF Database Seeding...');
  const db = getDb();

  try {
    // 1. Seed Departments
    console.log('[Seed] Seeding departments...');
    for (const dept of BASELINE_DEPARTMENTS) {
      await db.from('departments').upsert({
        id: dept.id,
        name: dept.name,
        code: dept.code,
      }, { onConflict: 'id' });
    }
    console.log(`[Seed] Seeded ${BASELINE_DEPARTMENTS.length} departments.`);

    // 2. Seed Competencies
    console.log('[Seed] Seeding competencies...');
    for (const comp of BASELINE_COMPETENCIES) {
      await db.from('competencies').upsert({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        univ_avg: comp.univAvg,
      }, { onConflict: 'id' });
    }
    console.log(`[Seed] Seeded ${BASELINE_COMPETENCIES.length} competencies.`);

    // 3. Seed Assessments
    console.log('[Seed] Seeding assessments...');
    for (const asmt of BASELINE_ASSESSMENTS) {
      await db.from('assessments').upsert({
        id: asmt.id,
        name: asmt.name,
        department: asmt.department,
        department_id: asmt.departmentId,
        time_limit: asmt.timeLimit,
        questions_per_competency: asmt.questionsPerCompetency,
        total_questions: asmt.totalQuestions,
        active: asmt.active,
        description: asmt.description,
        created_by: asmt.createdBy,
      }, { onConflict: 'id' });
    }
    console.log(`[Seed] Seeded ${BASELINE_ASSESSMENTS.length} assessments.`);

    // 4. Seed Questions from skills_data.json
    console.log('[Seed] Loading questions from skills_data.json...');
    const skillsJsonPath = path.resolve(process.cwd(), '../skills_data.json');
    if (fs.existsSync(skillsJsonPath)) {
      const skills = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf-8'));
      const questionsList: any[] = [];

      skills.forEach((s: any) => {
        (s.questions || []).forEach((q: any) => {
          questionsList.push({
            id: Number(q.id),
            skill_id: Number(q.skillId),
            skill_name: q.skillName,
            text: q.text,
            is_reverse: Boolean(q.isReverse),
            difficulty: q.isReverse ? 'Intermediate' : 'Standard',
            approval_status: 'approved',
            created_by: 'System Seed',
          });
        });
      });

      // Insert in chunks of 50
      for (let i = 0; i < questionsList.length; i += 50) {
        const chunk = questionsList.slice(i, i + 50);
        await db.from('questions').upsert(chunk, { onConflict: 'id' });
      }
      console.log(`[Seed] Successfully seeded ${questionsList.length} questions into public.questions.`);
    }

    // 5. Seed Preset Users
    console.log('[Seed] Seeding default SaaS users...');
    const presetUsers: any[] = [
      {
        id: 'usr_riya_sharma',
        email: 'riya.sharma@mru.edu.in',
        name: 'Riya Sharma',
        role: 'student',
        department: 'Computer Science & Engineering',
        dept_code: 'CSE',
        year: '3rd Year (Batch 2022-26)',
        roll_no: '22CSE0002',
        avatar: '/assets/mr_student_riya.jpg',
        designation: 'Student',
      },
      {
        id: 'usr_arvind_mehta',
        email: 'arvind.mehta@mru.edu.in',
        name: 'Dr. Arvind Mehta',
        role: 'dept_head',
        department: 'Computer Science & Engineering',
        dept_code: 'CSE',
        year: 'Faculty Lead',
        roll_no: null,
        avatar: null,
        designation: 'Head of Department (FET)',
      },
      {
        id: 'usr_sunita_rao',
        email: 'admin.iccf@mru.edu.in',
        name: 'Prof. Sunita Rao',
        role: 'core_team', // Bootstrap admin
        department: 'Institutional Framework Directorate',
        dept_code: 'CORE',
        year: 'Central Administration',
        roll_no: null,
        avatar: null,
        designation: 'Director, Competency & Accreditation',
      },
      {
        id: 'usr_sysadmin',
        email: 'sysadmin@mru.edu.in',
        name: 'IT Systems Admin',
        role: 'system_admin',
        department: 'Center for Computing & Information Services',
        dept_code: 'CCIS',
        year: 'IT Operations',
        roll_no: null,
        avatar: null,
        designation: 'Senior Infrastructure Engineer',
      },
    ];

    for (const u of presetUsers) {
      await db.from('users').upsert(u, { onConflict: 'email' });
    }
    console.log(`[Seed] Seeded ${presetUsers.length} baseline users.`);

    console.log('✅ [Seed] Database seeding completed successfully!');
  } catch (err: any) {
    console.error('❌ [Seed] Error during database seeding:', err.message);
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].includes('seedDatabase')) {
  runDatabaseSeed().then(() => process.exit(0));
}
