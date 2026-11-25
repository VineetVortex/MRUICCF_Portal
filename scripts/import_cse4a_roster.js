import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const rawData = [
  { rollNo: "2K24CSUN01002", name: "Aayush Dubey", officialEmail: "aayush_dubey24@mru.ac.in", personalEmail: "ayushdubey00067@gmail.com" },
  { rollNo: "2K24CSUN01003", name: "Aditya Vats", officialEmail: "aditya_vats24@mru.ac.in", personalEmail: "adityavats2006@gmail.com" },
  { rollNo: "2K24CSUN01004", name: "Akshat Verma", officialEmail: "akshat_verma24@mru.ac.in", personalEmail: "akshat2381@gmail.com" },
  { rollNo: "2K24CSUN01008", name: "Anupam Kumar", officialEmail: "anupam_kumar24@mru.ac.in", personalEmail: "anupamkr0904@gmail.com" },
  { rollNo: "2K24CSUN01009", name: "Anushka Garg", officialEmail: "anushka_garg24@mru.ac.in", personalEmail: "garg19anushka@gmail.com" },
  { rollNo: "2K24CSUN01010", name: "Ashok Nagpal", officialEmail: "ashok_nagpal24@mru.ac.in", personalEmail: "shrinagpal09@gmail.com" },
  { rollNo: "2K24CSUN01011", name: "AYUSH KUMAR", officialEmail: "ayush_kumar24@mru.ac.in", personalEmail: "indu2635@gmail.com" },
  { rollNo: "2K24CSUN01012", name: "Bhoomika Sharma", officialEmail: "bhoomika_sharma24@mru.ac.in", personalEmail: "bhoomi2060@gmail.com" },
  { rollNo: "2K24CSUN01013", name: "BORA SHIVA PRASAD", officialEmail: "bora_prasad24@mru.ac.in", personalEmail: "borashivaprasad07@gmail.com" },
  { rollNo: "2K24CSUN01014", name: "Chetan Sharma", officialEmail: "chetan_sharma24@mru.ac.in", personalEmail: "chetanbhardwaj240@gmail.com" },
  { rollNo: "2K24CSUN01015", name: "Chetanya Hans", officialEmail: "chetanya_hans24@mru.ac.in", personalEmail: "chetanyahans@gmail.com" },
  { rollNo: "2K24CSUN01016", name: "Chirag Sood", officialEmail: "chirag_sood24@mru.ac.in", personalEmail: "chiragsood25@gmail.com" },
  { rollNo: "2K24CSUN01017", name: "Daiwik Bhardwaj", officialEmail: "daiwik_bhardwaj24@mru.ac.in", personalEmail: "arun.ku.sharma@gmail.com" },
  { rollNo: "2K24CSUN01019", name: "Drashtee Singh chauhan", officialEmail: "drashtee_chauhan24@mru.ac.in", personalEmail: "drashteechauhan@gmail.com" },
  { rollNo: "2K24CSUN01020", name: "DUGGEMPUDI MANIKANTA", officialEmail: "duggempudi_manikanta24@mru.ac.in", personalEmail: "manikantaduggempudi23@gmail.com" },
  { rollNo: "2K24CSUN01021", name: "Gaurav", officialEmail: "gaurav_24@mru.ac.in", personalEmail: "gouravjangra8305@gmail.com" },
  { rollNo: "2K24CSUN01022", name: "GOLLA BRAMESH", officialEmail: "golla_bramesh24@mru.ac.in", personalEmail: "pg458520@gmail.com" },
  { rollNo: "2K24CSUN01023", name: "GUBBALA THRIKSHAN SRI SAI", officialEmail: "gubbala_sai24@mru.ac.in", personalEmail: "gubblathirkshant@gmail.com" },
  { rollNo: "2K24CSUN01025", name: "Harsheen Kaur", officialEmail: "harsheen_kaur24@mru.ac.in", personalEmail: "kaurharsheen2017@gmail.com" },
  { rollNo: "2K24CSUN01026", name: "HARSHIT SAREEN", officialEmail: "harshit_sareen24@mru.ac.in", personalEmail: "sareenharshit7@gmail.com" },
  { rollNo: "2K24CSUN01027", name: "HARSHIT YADAV", officialEmail: "harshit_yadav24@mru.ac.in", personalEmail: "meenayadav6t@gmail.com" },
  { rollNo: "2K24CSUN01028", name: "Hemant Sharma", officialEmail: "hemant_sharma24@mru.ac.in", personalEmail: "rajeshs9540@gmail.com" },
  { rollNo: "2K24CSUN01030", name: "JAI KISHAN SAINI", officialEmail: "jai_saini24@mru.ac.in", personalEmail: "kapil1360179@gmail.com" },
  { rollNo: "2K24CSUN01031", name: "Jatin Solanki", officialEmail: "jatin_solanki24@mru.ac.in", personalEmail: "rajivthakur1780@gmail.com" },
  { rollNo: "2K24CSUN01032", name: "Kajal Kumari", officialEmail: "kajal_kumari24@mru.ac.in", personalEmail: "kajal.ks796@gmail.com" },
  { rollNo: "2K24CSUN01033", name: "KAVYANSH KAUSHIK", officialEmail: "kavyansh_kaushik24@mru.ac.in", personalEmail: "kavyanshkaushik1@gmail.com" },
  { rollNo: "2K24CSUN01034", name: "Keshav Goel", officialEmail: "keshav_goel24@mru.ac.in", personalEmail: "goelsanjul00@gmail.com" },
  { rollNo: "2K24CSUN01037", name: "Kritika", officialEmail: "kritika_24@mru.ac.in", personalEmail: "chhabrakritika541@gmail.com" },
  { rollNo: "2K24CSUN01038", name: "Kunal Chauhan", officialEmail: "kunal_chauhan24@mru.ac.in", personalEmail: "kunal75chauhan@gmail.com" },
  { rollNo: "2K24CSUN01039", name: "MAYANK", officialEmail: "mayank_24@mru.ac.in", personalEmail: "mayankparjapati959@gmail.com" },
  { rollNo: "2K24CSUN01040", name: "Mayank Negi", officialEmail: "mayank_negi24@mru.ac.in", personalEmail: "mayanknegi118@gmail.com" },
  { rollNo: "2K24CSUN01041", name: "NALLURI GEETHA MANASWINI", officialEmail: "nalluri_manaswini24@mru.ac.in", personalEmail: "manunalluri76@gmail.com" },
  { rollNo: "2K24CSUN01042", name: "Nancy", officialEmail: "nancy_24@mru.ac.in", personalEmail: "nancymangla2006@gmail.com" },
  { rollNo: "2K24CSUN01043", name: "Nandini Chauhan", officialEmail: "nandini_chauhan24@mru.ac.in", personalEmail: "cnandini656@gmail.com" },
  { rollNo: "2K24CSUN01044", name: "NEHA GUPTA", officialEmail: "neha_gupta24@mru.ac.in", personalEmail: "nehag0864@gmail.com" },
  { rollNo: "2K24CSUN01045", name: "Nikhil Kuntal", officialEmail: "nikhil_kuntal24@mru.ac.in", personalEmail: "nhilkunt@gmail.com" },
  { rollNo: "2K24CSUN01046", name: "Nirvikalp Agrawal", officialEmail: "nirvikalp_agrawal24@mru.ac.in", personalEmail: "sakhaagrawal5@gmail.com" },
  { rollNo: "2K24CSUN01048", name: "NUKALA MAHESH", officialEmail: "nukala_mahesh24@mru.ac.in", personalEmail: "mnukala83@gmail.com" },
  { rollNo: "2K24CSUN01050", name: "Parth Parmar", officialEmail: "parth_parmar24@mru.ac.in", personalEmail: "parthparmar336699@gmail.com" },
  { rollNo: "2K24CSUN01053", name: "PRABAL PRATAP SINGH", officialEmail: "prabal_singh24@mru.ac.in", personalEmail: "prabalpratapsingst.johns@gmail.com" },
  { rollNo: "2K24CSUN01055", name: "Prince Rawat", officialEmail: "prince_rawat24@mru.ac.in", personalEmail: "princerawat1979@gmail.com" },
  { rollNo: "2K24CSUN01056", name: "Renu Tewatia", officialEmail: "renu_tewatia24@mru.ac.in", personalEmail: "tewatiarenu06@gmail.com" },
  { rollNo: "2K24CSUN01057", name: "RISHI VERMA", officialEmail: "rishi_verma24@mru.ac.in", personalEmail: "rishi.vr2006@gmail.com" },
  { rollNo: "2K24CSUN01058", name: "Riya Mahto", officialEmail: "riya_mahto24@mru.ac.in", personalEmail: "riyamahto2006@gmail.com" },
  { rollNo: "2K24CSUN01059", name: "RUDRANSH SINGH", officialEmail: "rudransh_singh24@mru.ac.in", personalEmail: "rudranshsinghfbd@gmail.com" },
  { rollNo: "2K24CSUN01060", name: "Sakshi Sharma", officialEmail: "sakshi_sharma24@mru.ac.in", personalEmail: "sakshisharma59305@gmail.com" },
  { rollNo: "2K24CSUN01062", name: "Shakti Singh", officialEmail: "shakti_singh24@mru.ac.in", personalEmail: "shakti70469@gmail.com" },
  { rollNo: "2K24CSUN01063", name: "SHASHANK DUBEY", officialEmail: "shashank_dubey24@mru.ac.in", personalEmail: "shashankdubey0158@gmail.com" },
  { rollNo: "2K24CSUN01065", name: "Siya Bhardwaj", officialEmail: "siya_bhardwaj24@mru.ac.in", personalEmail: "siyabhardwaj2006@gmail.com" },
  { rollNo: "2K24CSUN01066", name: "VADIKARI PREM CHAND", officialEmail: "vadikari_prem_chand24@mru.ac.in", personalEmail: "premnani2006@gmail.com" },
  { rollNo: "2K24CSUN01069", name: "Vineet Kumar Vineet", officialEmail: "vineet_kumar24@mru.ac.in", personalEmail: "vinodsingh271204@gmail.com" },
  { rollNo: "2K24CSUN01071", name: "Yash Chauhan", officialEmail: "yash_chauhan24@mru.ac.in", personalEmail: "yash0620chauhan@gmail.com" },
  { rollNo: "2K24CSUN01072", name: "Yavish Upmanyu", officialEmail: "yavish_upmanyu24@mru.ac.in", personalEmail: "yavishupmanyu6@gmail.com" },
  { rollNo: "2K25CSUL01011", name: "Rishit Raj", officialEmail: "rishit_raj25@mru.ac.in", personalEmail: "rishitraj0905@gmail.com" },
  { rollNo: "2K25CSUM01012", name: "Abhishek Punyani", officialEmail: "abhishek_punyani25@mru.ac.in", personalEmail: "abhishek.punyani@gmail.com" }
];

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jmzwuciamqedlskleitr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptend1Y2lhbXFlZGxza2xlaXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzM5MTMsImV4cCI6MjEwNzMwOTkxM30.JThvFqkVxKEPBcBeUqA4KuYiEVbVL9c0uEixN8g5JYc';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runImport() {
  console.log(`Processing ${rawData.length} students from CSE 4A...`);

  // Build Supabase users array (both official and personal emails)
  const usersToUpsert = [];
  const authorizedTesters = [];
  const rosterEntries = [];

  const now = new Date().toISOString();

  for (const s of rawData) {
    const cleanOfficial = s.officialEmail.toLowerCase().trim();
    const cleanPersonal = s.personalEmail ? s.personalEmail.toLowerCase().trim() : null;
    const cleanRoll = s.rollNo.toUpperCase().trim();

    // 1. Official Email record
    const officialId = `usr_${cleanRoll.toLowerCase()}_off`;
    usersToUpsert.push({
      id: officialId,
      email: cleanOfficial,
      name: s.name,
      role: 'student',
      department: 'Computer Science & Technology',
      dept_code: 'CST',
      year: 'BTech CSE Sem 4',
      roll_no: cleanRoll,
      created_at: now,
      last_login_at: now
    });

    authorizedTesters.push({
      name: s.name,
      department: 'B.Tech CSE Core (Sem 4)',
      rollNo: cleanRoll,
      email: cleanOfficial,
      role: 'student'
    });

    rosterEntries.push({
      id: `rost_${cleanRoll.toLowerCase()}_off`,
      fullName: s.name,
      department: 'B.Tech CSE Core',
      rollNumber: cleanRoll,
      email: cleanOfficial,
      teamId: 'SECTION-4A',
      isAuthorized: true,
      createdAt: now,
      updatedAt: now
    });

    // 2. Personal Email record (if present)
    if (cleanPersonal && cleanPersonal.includes('@') && cleanPersonal !== cleanOfficial) {
      const personalId = `usr_${cleanRoll.toLowerCase()}_pers`;
      usersToUpsert.push({
        id: personalId,
        email: cleanPersonal,
        name: s.name,
        role: 'student',
        department: 'Computer Science & Technology',
        dept_code: 'CST',
        year: 'BTech CSE Sem 4',
        roll_no: cleanRoll,
        created_at: now,
        last_login_at: now
      });

      authorizedTesters.push({
        name: s.name,
        department: 'B.Tech CSE Core (Sem 4)',
        rollNo: cleanRoll,
        email: cleanPersonal,
        role: 'student'
      });

      rosterEntries.push({
        id: `rost_${cleanRoll.toLowerCase()}_pers`,
        fullName: s.name,
        department: 'B.Tech CSE Core',
        rollNumber: cleanRoll,
        email: cleanPersonal,
        teamId: 'SECTION-4A',
        isAuthorized: true,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  console.log(`Generated ${usersToUpsert.length} user accounts for Supabase (Official + Personal).`);

  // Batch Upsert to Supabase
  let successCount = 0;
  let errorCount = 0;
  for (let i = 0; i < usersToUpsert.length; i += 20) {
    const batch = usersToUpsert.slice(i, i + 20);
    const { error } = await sb.from('users').upsert(batch, { onConflict: 'email' });
    if (error) {
      console.error(`Batch ${i / 20 + 1} error:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }
  console.log(`Supabase users sync complete: ${successCount} upserted, ${errorCount} errors.`);

  // Update JSON files across all repository locations
  const testerPaths = [
    'src/data/mruAuthorizedTesters.json',
    'server/src/data/mruAuthorizedTesters.json',
    'ICCF_Frontend/src/data/mruAuthorizedTesters.json',
    'ICCF_Backend/src/data/mruAuthorizedTesters.json'
  ];

  for (const p of testerPaths) {
    try {
      if (fs.existsSync(p)) {
        const existing = JSON.parse(fs.readFileSync(p, 'utf-8'));
        const existingEmails = new Set(existing.map(e => e.email.toLowerCase().trim()));
        const merged = [...existing];
        for (const t of authorizedTesters) {
          if (!existingEmails.has(t.email.toLowerCase().trim())) {
            merged.push(t);
            existingEmails.add(t.email.toLowerCase().trim());
          }
        }
        fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
        console.log(`Updated ${p} with ${merged.length} testers.`);
      }
    } catch (e) {
      console.warn(`Could not update ${p}:`, e.message);
    }
  }

  // Update roster files
  const rosterPaths = [
    'data/tester_roster.json',
    'server/data/tester_roster.json'
  ];

  for (const rp of rosterPaths) {
    try {
      if (fs.existsSync(rp)) {
        const existingRoster = JSON.parse(fs.readFileSync(rp, 'utf-8'));
        const existingEmails = new Set(existingRoster.map(r => r.email.toLowerCase().trim()));
        const mergedRoster = [...existingRoster];
        for (const r of rosterEntries) {
          if (!existingEmails.has(r.email.toLowerCase().trim())) {
            mergedRoster.push(r);
            existingEmails.add(r.email.toLowerCase().trim());
          }
        }
        fs.writeFileSync(rp, JSON.stringify(mergedRoster, null, 2), 'utf-8');
        console.log(`Updated ${rp} with ${mergedRoster.length} roster entries.`);
      }
    } catch (e) {
      console.warn(`Could not update ${rp}:`, e.message);
    }
  }

  console.log('All student imports completed successfully!');
}

runImport().catch(console.error);
