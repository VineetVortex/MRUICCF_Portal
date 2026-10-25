import { Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { Competency, Department } from '../types/index.js';

export const BASELINE_COMPETENCIES: Competency[] = [
  { id: 1, name: 'Communication', description: 'Articulates technical and interpersonal ideas with clarity and stakeholder empathy.', univAvg: 74 },
  { id: 2, name: 'Active Listening', description: 'Listens attentively without interrupting, assimilating feedback productively.', univAvg: 71 },
  { id: 3, name: 'Teamwork & Collaboration', description: 'Cooperates effectively across cross-functional groups towards shared project milestones.', univAvg: 75 },
  { id: 4, name: 'Empathy', description: 'Demonstrates situational awareness and sensitivity toward diverse team perspectives.', univAvg: 70 },
  { id: 5, name: 'Adaptability', description: 'Navigates shifting requirements, novel frameworks, and uncertain engineering parameters.', univAvg: 73 },
  { id: 6, name: 'Problem-Solving & Critical Thinking', description: 'Deconstructs complex constraints into structured, evidence-based solutions.', univAvg: 76 },
  { id: 7, name: 'Conflict Resolution & Negotiation', description: 'Mediates interpersonal friction constructively to reach mutually agreeable compromises.', univAvg: 68 },
  { id: 8, name: 'Self-Awareness', description: 'Recognizes personal limitations, emotional triggers, and cognitive blindspots.', univAvg: 72 },
  { id: 9, name: 'Emotional Regulation', description: 'Maintains composure, focus, and constructive demeanor under acute pressure.', univAvg: 69 },
  { id: 10, name: 'Stress Management', description: 'Applies proactive resilience strategies to prevent burnout in high-demand environments.', univAvg: 67 },
  { id: 11, name: 'Ethics', description: 'Maintains uncompromising professional integrity and accountability.', univAvg: 79 },
  { id: 12, name: 'Integrity', description: 'Upholds commitments, transparency, and academic rigor in all collaborative contexts.', univAvg: 78 },
  { id: 13, name: 'Professional Etiquette', description: 'Adheres to high standards of workplace civility, promptness, and professional communication.', univAvg: 74 },
  { id: 14, name: 'Time Management', description: 'Prioritizes workflows efficiently to meet academic and industry deadlines consistently.', univAvg: 71 },
  { id: 15, name: 'Lifelong Learning', description: 'Actively acquires novel technical competencies and seeks continuous self-improvement.', univAvg: 77 },
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
