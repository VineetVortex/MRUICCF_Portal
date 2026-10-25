import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { gradeOpenEndedAnswer, getModelPoolStatus, FREE_MODELS } from '../services/aiService.js';

export async function evaluateAnswerWithAi(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { questionText, rubric, studentAnswer, competencyName } = req.body;

  if (!studentAnswer || !competencyName) {
    res.status(400).json({ success: false, error: 'studentAnswer and competencyName are required.' });
    return;
  }

  try {
    const result = await gradeOpenEndedAnswer({
      questionText: questionText || 'Open-ended competency evaluation',
      rubric,
      studentAnswer,
      competencyName,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'AI evaluation failed.' });
  }
}

export async function getAiModelHealth(req: Request, res: Response): Promise<void> {
  try {
    const pool = getModelPoolStatus();
    res.status(200).json({
      success: true,
      models: pool,
      totalFreeModels: FREE_MODELS.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
