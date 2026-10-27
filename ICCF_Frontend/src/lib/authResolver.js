import facultyData from '../data/mruFacultyDirectory.json';
import testerData from '../data/mruAuthorizedTesters.json';
import { BOOTSTRAP_ADMIN_EMAIL, USER_ROLES } from './storage';

const facultyMap = new Map();
if (Array.isArray(facultyData)) {
  facultyData.forEach((f) => {
    if (f.email) {
      facultyMap.set(f.email.trim().toLowerCase(), f);
    }
  });
}

const testerMap = new Map();
if (Array.isArray(testerData)) {
  testerData.forEach((t) => {
    if (t.email) {
      testerMap.set(t.email.trim().toLowerCase(), t);
    }
  });
}

/**
 * Enterprise Role Resolver (Client-side mirror of backend resolver)
 * Provides 0ms offline fallback if the backend API server is not running.
 */
export function resolveClientIdentity(email, rawName = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const prefix = cleanEmail.split('@')[0] || 'user';

  // 1. Leadership, Admin & Faculty Whitelist
  if (
    cleanEmail === 'vineetkumar182023@gmail.com' ||
    cleanEmail === 'iccf@mruadmin.edu.in' ||
    cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase().trim() ||
    cleanEmail.startsWith('vc@') ||
    cleanEmail.startsWith('registrar@') ||
    cleanEmail.includes('director.academics')
  ) {
    const isVc = cleanEmail.startsWith('vc@');
    const isVineet = cleanEmail === 'vineetkumar182023@gmail.com';
    return {
      id: `usr_admin_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      uid: `usr_admin_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      email: cleanEmail,
      name: rawName || (isVineet ? 'Vineet Kumar' : cleanEmail === 'iccf@mruadmin.edu.in' ? 'ICCF Institutional Administrator' : isVc ? 'Vice Chancellor' : 'Central Administration Director'),
      role: USER_ROLES.CORE_TEAM,
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      designation: isVineet ? 'Institutional Admin & Faculty Lead' : isVc ? 'Vice Chancellor' : 'Institutional Admin / Core Team',
      rollNo: 'ADM-001',
      year: 'Faculty & Administration',
      lastLoginAt: new Date().toISOString()
    };
  }

  // 1b. Official Authorized Tester Roster Match (from Google Sheet / Uploaded Excel)
  const rosterTester = testerMap.get(cleanEmail);
  if (rosterTester) {
    return {
      id: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      uid: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      email: cleanEmail,
      name: rosterTester.name,
      role: rosterTester.role || USER_ROLES.STUDENT,
      department: rosterTester.department || 'B.Tech CSE Core',
      deptCode: 'CST',
      designation: 'Undergraduate Student',
      rollNo: rosterTester.rollNo,
      year: 'Batch 2024-2028 (1st Year)',
      lastLoginAt: new Date().toISOString()
    };
  }

  // 2. Official Faculty Directory Match
  const faculty = facultyMap.get(cleanEmail);
  if (faculty) {
    const isExplicitDeptHead = 
      faculty.role === 'dept_head' && (
        cleanEmail.startsWith('hod.') ||
        (faculty.designation || '').toLowerCase().includes('hod') ||
        (faculty.designation || '').toLowerCase().includes('head') ||
        (faculty.designation || '').toLowerCase().includes('dean')
      );
    const resolvedRole = faculty.role === 'core_team' 
      ? USER_ROLES.CORE_TEAM 
      : (isExplicitDeptHead ? USER_ROLES.DEPT_HEAD : USER_ROLES.FACULTY);

    return {
      id: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      uid: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      email: cleanEmail,
      name: faculty.name,
      role: resolvedRole,
      department: faculty.department,
      deptCode: faculty.dept_code,
      designation: faculty.designation,
      rollNo: `FAC-${faculty.dept_code}`,
      year: 'Academic Faculty',
      lastLoginAt: new Date().toISOString()
    };
  }

  // 2b. Check Faculty / HoD Aliases
  if (cleanEmail === 'hod.cse@mru.edu.in') {
    return {
      id: 'usr_fac_cst_viveksharma',
      uid: 'usr_fac_cst_viveksharma',
      email: cleanEmail,
      name: 'Dr. Vivek Sharma',
      role: USER_ROLES.DEPT_HEAD,
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      designation: 'HoD',
      rollNo: 'FAC-CST',
      year: 'Academic Faculty',
      lastLoginAt: new Date().toISOString()
    };
  }

  if (cleanEmail === 'faculty.cse@mru.edu.in') {
    return {
      id: 'usr_fac_cst_deepti',
      uid: 'usr_fac_cst_deepti',
      email: cleanEmail,
      name: 'Dr. Deepti Thakral',
      role: USER_ROLES.FACULTY,
      department: 'Computer Science & Technology',
      deptCode: 'CST',
      designation: 'Assoc. Prof.',
      rollNo: 'FAC-CST',
      year: 'Academic Faculty',
      lastLoginAt: new Date().toISOString()
    };
  }

  // 3. Automated Student Parsing
  const rollMatch = prefix.match(/^(\d{2})([a-zA-Z]{2,4})(\d{3,5})$/);
  let studentRollNo = prefix.toUpperCase();
  let studentDept = 'Computer Science & Technology';
  let studentDeptCode = 'CST';
  let studentYear = 'Undergraduate Student';

  if (rollMatch) {
    const admissionYear = 2000 + parseInt(rollMatch[1], 10);
    const deptCode = rollMatch[2].toUpperCase();
    studentRollNo = `${rollMatch[1]}${deptCode}${rollMatch[3]}`;

    const deptMap = {
      CSE: 'Computer Science & Technology',
      CST: 'Computer Science & Technology',
      ECE: 'Electronics & Communication',
      ME: 'Mechanical Engineering',
      RAI: 'Robotics & Artificial Intelligence',
      LAW: 'School of Law',
      MGT: 'School of Management',
    };

    studentDept = deptMap[deptCode] || 'Applied Sciences & Humanities';
    studentDeptCode = deptCode;
    studentYear = `Batch ${admissionYear}-${admissionYear + 4}`;
  }

  // Check if previously registered student exists in local store
  try {
    const registeredStore = localStorage.getItem('mr_iccf_registered_students');
    if (registeredStore) {
      const registeredMap = JSON.parse(registeredStore);
      if (registeredMap[cleanEmail]) {
        return {
          ...registeredMap[cleanEmail],
          lastLoginAt: new Date().toISOString()
        };
      }
    }
  } catch (err) {
    // Ignore localStorage parse error
  }

  const formattedName = rawName || prefix
    .replace(/[0-9_.]/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Student';

  return {
    id: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    uid: `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    email: cleanEmail,
    name: formattedName,
    role: USER_ROLES.STUDENT,
    department: studentDept,
    deptCode: studentDeptCode,
    designation: 'Undergraduate Student',
    rollNo: studentRollNo,
    year: studentYear,
    lastLoginAt: new Date().toISOString()
  };
}

/**
 * Parses an institutional student email to extract batch, department, and roll number
 * Student domain: @mru.ac.in
 * Faculty domain: @mru.edu.in
 */
export function parseStudentEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const prefix = cleanEmail.split('@')[0] || '';
  const domain = cleanEmail.split('@')[1] || '';

  const isStudentDomain = domain === 'mru.ac.in' || domain.endsWith('.mru.ac.in');
  const isFacultyDomain = domain === 'mru.edu.in' || domain.endsWith('.mru.edu.in');

  // Check tester map first
  if (testerMap.has(cleanEmail)) {
    const t = testerMap.get(cleanEmail);
    return {
      isValidFormat: true,
      isStudentDomain,
      isFacultyDomain,
      rollNo: t.rollNo || prefix.toUpperCase(),
      deptCode: 'CST',
      department: t.department || 'Computer Science & Technology',
      year: 'Batch 2024-2028 (1st Year)',
      academicYear: '1st Year'
    };
  }

  // Pattern 1: e.g. 22cse0002
  const rollMatch = prefix.match(/^(\d{2})([a-zA-Z]{2,4})(\d{3,5})$/);
  // Pattern 2: e.g. vineet_kumar24 or anupam_kumar24 (first_lastYY)
  const nameYearMatch = prefix.match(/^([a-zA-Z_]+?)(\d{2})$/);

  if (!rollMatch && !nameYearMatch) {
    return {
      isValidFormat: isStudentDomain,
      isStudentDomain,
      isFacultyDomain,
      rollNo: prefix.toUpperCase(),
      deptCode: 'CST',
      department: 'Computer Science & Technology',
      year: 'Batch 2024-2028',
      academicYear: 'Undergraduate'
    };
  }

  const admissionYear = rollMatch ? (2000 + parseInt(rollMatch[1], 10)) : (2000 + parseInt(nameYearMatch[2], 10));
  const deptCode = rollMatch ? rollMatch[2].toUpperCase() : 'CST';
  const rollNo = rollMatch ? `${rollMatch[1]}${deptCode}${rollMatch[3]}` : prefix.toUpperCase();

  const deptMap = {
    CSE: 'Computer Science & Technology',
    CST: 'Computer Science & Technology',
    ECE: 'Electronics & Communication',
    ME: 'Mechanical Engineering',
    RAI: 'Robotics & Artificial Intelligence',
    LAW: 'School of Law',
    MGT: 'School of Management',
    PHY: 'Applied Sciences (Physics)',
    CHM: 'Applied Sciences (Chemistry)',
    MTH: 'Applied Sciences (Mathematics)'
  };

  const currentYear = new Date().getFullYear();
  const yearDiff = currentYear - admissionYear;
  let academicYear = '1st Year';
  if (yearDiff === 1) academicYear = '2nd Year';
  else if (yearDiff === 2) academicYear = '3rd Year';
  else if (yearDiff >= 3) academicYear = '4th Year';

  return {
    isValidFormat: true,
    isStudentDomain,
    isFacultyDomain,
    rollNo,
    deptCode: deptCode === 'CSE' ? 'CST' : deptCode,
    department: deptMap[deptCode] || 'Computer Science & Technology',
    year: `Batch ${admissionYear}-${admissionYear + 4}`,
    academicYear
  };
}

/**
 * Registers a student locally into the offline index
 */
export function registerClientStudent({ name, email, rollNo, department, deptCode, year, program }) {
  const cleanEmail = email.trim().toLowerCase();
  const prefix = cleanEmail.split('@')[0];
  const userId = `usr_${prefix.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  const studentUser = {
    id: userId,
    uid: userId,
    email: cleanEmail,
    name: name.trim(),
    role: USER_ROLES.STUDENT,
    department: department || 'Computer Science & Technology',
    deptCode: deptCode || 'CST',
    year: year || 'Batch 2022-2026',
    rollNo: rollNo ? rollNo.trim().toUpperCase() : prefix.toUpperCase(),
    designation: program ? `${program} Student` : 'Undergraduate Student',
    lastLoginAt: new Date().toISOString()
  };

  try {
    const existing = JSON.parse(localStorage.getItem('mr_iccf_registered_students') || '{}');
    existing[cleanEmail] = studentUser;
    localStorage.setItem('mr_iccf_registered_students', JSON.stringify(existing));
  } catch (err) {
    console.warn('[Auth] Failed to cache registered student locally:', err);
  }

  return studentUser;
}

/**
 * Client-side OTP Management for Offline/Local Resilience
 */
export function generateClientOtp(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    const store = JSON.parse(localStorage.getItem('mr_iccf_otps') || '{}');
    store[cleanEmail] = { code, expiresAt, attempts: 0 };
    localStorage.setItem('mr_iccf_otps', JSON.stringify(store));
  } catch (err) {
    // Ignore storage err
  }

  console.log(`[CLIENT OTP ENGINE] Generated OTP for ${cleanEmail}: ${code}`);
  return code;
}

export function verifyClientOtp(email, enteredCode) {
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const store = JSON.parse(localStorage.getItem('mr_iccf_otps') || '{}');
    const record = store[cleanEmail];
    if (!record) {
      return { success: false, error: 'No active OTP found. Please click Resend OTP.' };
    }
    if (Date.now() > record.expiresAt) {
      delete store[cleanEmail];
      localStorage.setItem('mr_iccf_otps', JSON.stringify(store));
      return { success: false, error: 'OTP has expired. Please request a new code.' };
    }
    if (record.code !== enteredCode.trim()) {
      return { success: false, error: 'Invalid verification code. Please check your email and try again.' };
    }

    // Success! Clear OTP
    delete store[cleanEmail];
    localStorage.setItem('mr_iccf_otps', JSON.stringify(store));
    const user = resolveClientIdentity(cleanEmail);
    return { success: true, user };
  } catch (err) {
    return { success: false, error: 'Error validating code. Please try again.' };
  }
}


