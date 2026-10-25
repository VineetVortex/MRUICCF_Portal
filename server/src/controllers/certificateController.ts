import { Request, Response } from 'express';
import { verifyCertificate as verifyCertService } from '../services/certificateService.js';
import { getDb } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export async function verifyCertificate(req: Request, res: Response): Promise<void> {
  const { identifier } = req.params;

  if (!identifier) {
    res.status(400).json({ success: false, error: 'Certificate identifier is required.' });
    return;
  }

  const result = await verifyCertService(String(identifier).trim());

  if (!result.valid) {
    res.status(404).json({
      success: false,
      valid: false,
      message: result.message,
    });
    return;
  }

  res.status(200).json({
    success: true,
    valid: true,
    message: result.message,
    data: result.certificate,
  });
}

export async function getUserCertificates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const studentId = req.params.studentId || req.user?.id || 'usr_riya_sharma';

  try {
    const db = getDb();
    const { data, error } = await db
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      count: (data || []).length,
      data: data || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch certificates.' });
  }
}
