import crypto from 'crypto';
import { getDb } from '../db/index.js';
import { Certificate, CompetencyScore } from '../types/index.js';

export function generateVerificationHash(
  studentId: string,
  assessmentId: string,
  score: number,
  issuedAt: string
): string {
  const payload = `${studentId}:${assessmentId}:${score}:${issuedAt}:MR_ICCF_AUTHENTICITY_SECRET`;
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32);
}

export function generateCertificateNumber(): string {
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `MR-ICCF-${year}-${randomSuffix}`;
}

const recentCertificatesCache = new Map<string, Certificate>();

export async function issueCertificate(params: {
  attemptId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  department?: string;
  assessmentId: string;
  assessmentName: string;
  overallScore: number;
  competencyScores: CompetencyScore[];
}): Promise<Certificate> {
  const certNumber = generateCertificateNumber();
  const issuedAt = new Date().toISOString();
  const verificationHash = generateVerificationHash(
    params.studentId,
    params.assessmentId,
    params.overallScore,
    issuedAt
  );

  const cert: Certificate = {
    id: `cert_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    certificateNumber: certNumber,
    attemptId: params.attemptId,
    studentId: params.studentId,
    studentName: params.studentName,
    rollNo: params.rollNo,
    department: params.department,
    assessmentId: params.assessmentId,
    assessmentName: params.assessmentName,
    overallScore: params.overallScore,
    competencyScores: params.competencyScores,
    verificationHash,
    issuedAt,
  };

  // Cache locally
  recentCertificatesCache.set(cert.id, cert);
  recentCertificatesCache.set(cert.certificateNumber, cert);
  recentCertificatesCache.set(cert.attemptId, cert);

  const db = getDb();
  try {
    await db.from('certificates').insert([{
      id: cert.id,
      certificate_number: cert.certificateNumber,
      attempt_id: cert.attemptId,
      student_id: cert.studentId,
      student_name: cert.studentName,
      roll_no: cert.rollNo,
      department: cert.department,
      assessment_id: cert.assessmentId,
      assessment_name: cert.assessmentName,
      overall_score: cert.overallScore,
      competency_scores: cert.competencyScores,
      verification_hash: cert.verificationHash,
      issued_at: cert.issuedAt,
    }]);
  } catch (error) {
    console.warn('[CertificateService] Warning inserting to remote DB:', error);
  }

  return cert;
}

export async function verifyCertificate(identifier: string): Promise<{
  valid: boolean;
  certificate?: Certificate;
  message: string;
}> {
  // Check local cache first
  const cached = recentCertificatesCache.get(identifier);
  if (cached) {
    return {
      valid: true,
      certificate: cached,
      message: 'Certificate authenticity verified successfully.',
    };
  }

  const db = getDb();
  try {
    const { data, error } = await db
      .from('certificates')
      .select('*')
      .or(`certificate_number.eq.${identifier},id.eq.${identifier},attempt_id.eq.${identifier}`)
      .limit(1)
      .single();

    if (error || !data) {
      return { valid: false, message: 'Certificate not found or invalid certificate number.' };
    }

    const cert: Certificate = {
      id: data.id,
      certificateNumber: data.certificate_number,
      attemptId: data.attempt_id,
      studentId: data.student_id,
      studentName: data.student_name,
      rollNo: data.roll_no,
      department: data.department,
      assessmentId: data.assessment_id,
      assessmentName: data.assessment_name,
      overallScore: Number(data.overall_score),
      competencyScores: data.competency_scores,
      verificationHash: data.verification_hash,
      issuedAt: data.issued_at,
    };

    return {
      valid: true,
      certificate: cert,
      message: 'Certificate authenticity verified successfully.',
    };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Verification failed.' };
  }
}
