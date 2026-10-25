import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getDb } from '../db/index.js';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { category, limit = 50 } = req.query;

  try {
    const db = getDb();
    let query = db.from('audit_logs').select('*');

    if (category) {
      query = query.eq('category', String(category));
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.status(200).json({
      success: true,
      count: (data || []).length,
      data: data || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch audit logs.' });
  }
}
