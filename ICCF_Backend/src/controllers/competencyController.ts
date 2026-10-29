import { Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { Competency, Department } from '../types/index.js';

export const BASELINE_COMPETENCIES: Competency[] = [
  { id: 1, name: 'Communication', description: 'Expresses ideas clearly, listens attentively, and adapts communication based on audience.', univAvg: 72 },
  { id: 2, name: 'Planning & Organizing', description: 'Sets clear goals, prioritizes tasks based on urgency and importance, and creates realistic timelines.', univAvg: 68 },
  { id: 3, name: 'Professionalism', description: 'Maintains punctuality, demonstrates respectful behavior, and upholds workplace decorum.', univAvg: 75 },
  { id: 4, name: 'Resource Management', description: 'Uses resources efficiently, avoids wastage, and optimizes material and time utilization.', univAvg: 65 },
  { id: 5, name: 'Building Trust', description: 'Keeps promises, maintains confidentiality, admits mistakes openly, and acts with consistency.', univAvg: 74 },
  { id: 6, name: 'Collaboration & Teamwork', description: 'Contributes actively to team tasks, respects diverse viewpoints, and values collective success.', univAvg: 76 },
  { id: 7, name: 'Conflict Resolution & Negotiation', description: 'Remains calm during disagreements, focuses on solutions, and aims for win-win outcomes.', univAvg: 63 },
  { id: 8, name: 'Emotional Intelligence', description: 'Recognizes emotional cues in self and others, managing emotions effectively under pressure.', univAvg: 71 },
  { id: 9, name: 'Empathy', description: 'Understands situations from others’ perspectives, showing genuine concern and active support.', univAvg: 74 },
  { id: 10, name: 'Inclusion', description: 'Encourages participation, respects diverse backgrounds, and challenges biased behavior.', univAvg: 77 },
  { id: 11, name: 'Ethics', description: 'Acts with integrity, follows guidelines sincerely, and reports unethical practices.', univAvg: 79 },
  { id: 12, name: 'Accountability', description: 'Takes ownership of actions, delivers on commitments, and corrects mistakes without blame-shifting.', univAvg: 70 },
  { id: 13, name: 'Lifelong Learning', description: 'Actively seeks opportunities to acquire new skills and stays updated with developments.', univAvg: 73 },
  { id: 14, name: 'Resilience', description: 'Remains optimistic during setbacks, recovers quickly, and adapts effectively to challenges.', univAvg: 67 },
  { id: 15, name: 'Self-Management', description: 'Regulates behavior in professional settings, manages distractions, and sustains performance standards.', univAvg: 64 },
];

export const BASELINE_DEPARTMENTS: Department[] = [
  { id: 'dept_cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept_ece', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept_me', name: 'Mechanical Engineering', code: 'ME' },
  { id: 'dept_mgt', name: 'School of Management & Commerce', code: 'SMC' },
  { id: 'dept_app', name: 'Applied Sciences & Humanities', code: 'ASH' },
];

export async function getCompetencies(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db.from('competencies').select('*').order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      res.status(200).json({ success: true, data: BASELINE_COMPETENCIES });
      return;
    }

    const formatted: Competency[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      univAvg: Number(d.univ_avg || 72),
      createdAt: d.created_at,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(200).json({ success: true, data: BASELINE_COMPETENCIES });
  }
}

export async function getDepartments(req: Request, res: Response): Promise<void> {
  try {
    const db = getDb();
    const { data, error } = await db.from('departments').select('*').order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      res.status(200).json({ success: true, data: BASELINE_DEPARTMENTS });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(200).json({ success: true, data: BASELINE_DEPARTMENTS });
  }
}

/**
 * Admin-only: Create a new competency
 */
export async function createCompetency(req: any, res: Response): Promise<void> {
  const { id, name, description, univAvg } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ success: false, error: 'Competency name is required.' });
    return;
  }

  try {
    const db = getDb();
    
    // Auto-calculate ID if not provided: max(id) + 1
    let newId = Number(id);
    if (!newId || isNaN(newId)) {
      const { data: existing } = await db.from('competencies').select('id').order('id', { ascending: false }).limit(1);
      newId = (existing?.[0]?.id || 15) + 1;
    }

    // Check duplicate
    const { data: dup } = await db.from('competencies').select('id').eq('id', newId).maybeSingle();
    if (dup) {
      res.status(409).json({ success: false, error: `Competency with ID ${newId} already exists.` });
      return;
    }

    const payload = {
      id: newId,
      name: name.trim(),
      description: description ? String(description).trim() : '',
      univ_avg: Number(univAvg) || 72,
      created_at: new Date().toISOString()
    };

    const { data, error } = await db.from('competencies').insert([payload]).select().single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      message: `Competency "${payload.name}" created successfully.`,
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        univAvg: Number(data.univ_avg || 72),
        createdAt: data.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create competency.' });
  }
}

/**
 * Admin-only: Update existing competency metadata
 */
export async function updateCompetency(req: any, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, univAvg } = req.body;

  const compId = Number(id);
  if (!compId || isNaN(compId)) {
    res.status(400).json({ success: false, error: 'Valid numeric competency ID required.' });
    return;
  }

  try {
    const db = getDb();
    const updates: Record<string, any> = {};
    if (name && typeof name === 'string') updates.name = name.trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (univAvg !== undefined && !isNaN(Number(univAvg))) updates.univ_avg = Number(univAvg);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: 'No fields provided to update.' });
      return;
    }

    const { data, error } = await db
      .from('competencies')
      .update(updates)
      .eq('id', compId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: `Competency #${compId} updated successfully.`,
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        univAvg: Number(data.univ_avg || 72),
        createdAt: data.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update competency.' });
  }
}
