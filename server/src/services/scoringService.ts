import { CompetencyScore, Question, Competency } from '../types/index.js';
import { config } from '../config/index.js';

export function getCompetencyLevel(percentage: number): {
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  name: string;
  label: string;
  marks: number;
  descriptor: string;
  color: string;
  bg: string;
} {
  const p = Math.round(percentage);
  if (p >= 85) {
    return {
      level: 'L5',
      name: 'Level 5 – Excellent (Highly Developed)',
      label: 'Level 5 – Excellent (Highly Developed)',
      marks: 4,
      descriptor: 'Consistently demonstrates professionalism, teamwork, emotional regulation and accountability in classroom & group tasks. Applies communication, collaboration, and ethical judgement confidently and effectively in real-time.',
      color: '#16A34A',
      bg: '#DCFCE7'
    };
  }
  if (p >= 70) {
    return {
      level: 'L4',
      name: 'Level 4 – Strong',
      label: 'Level 4 – Strong',
      marks: 3,
      descriptor: 'Demonstrates expected behaviours in most situations with minor lapses. Applies most skills effectively but may lack refinement or depth.',
      color: '#2563EB',
      bg: '#DBEAFE'
    };
  }
  if (p >= 55) {
    return {
      level: 'L3',
      name: 'Level 3 – Developing',
      label: 'Level 3 – Developing',
      marks: 2,
      descriptor: 'Demonstrates skills inconsistently; requires occasional reminders. Applies skills partially but lacks confidence or structure.',
      color: '#D97706',
      bg: '#FEF3C7'
    };
  }
  if (p >= 40) {
    return {
      level: 'L2',
      name: 'Level 2 – Needs Improvement',
      label: 'Level 2 – Needs Improvement',
      marks: 1,
      descriptor: 'Frequently requires guidance. Limited application of skills; needs prompting to participate effectively.',
      color: '#EA580C',
      bg: '#FFEDD5'
    };
  }
  return {
    level: 'L1',
    name: 'Level 1 – Critical Intervention Required',
    label: 'Level 1 – Critical Intervention Required',
    marks: 0,
    descriptor: 'Rarely demonstrates expected behaviours; unable to apply skills meaningfully even with support.',
    color: '#DC2626',
    bg: '#FEE2E2'
  };
}

export function getAdjustedQuestionScore(answerValue: number, isReverse: boolean = false): number {
  const val = Number(answerValue) || 3;
  if (isReverse) {
    return 6 - val;
  }
  return val;
}

export function calculateAssessmentAttempt(
  questions: Question[],
  answers: Record<string | number, number>,
  competencies: Competency[]
) {
  let totalRawPoints = 0;
  let totalAnsweredCount = 0;
  let totalPossiblePoints = 0;

  const competencyMap: Record<number, {
    id: number;
    name: string;
    description: string;
    univAvg: number;
    rawPoints: number;
    maxPoints: number;
    questionCount: number;
    answeredCount: number;
  }> = {};

  competencies.forEach((c) => {
    competencyMap[c.id] = {
      id: c.id,
      name: c.name,
      description: c.description || '',
      univAvg: c.univAvg || 72,
      rawPoints: 0,
      maxPoints: 0,
      questionCount: 0,
      answeredCount: 0,
    };
  });

  questions.forEach((q) => {
    const compId = q.skillId;
    if (!competencyMap[compId]) {
      competencyMap[compId] = {
        id: compId,
        name: q.skillName || `Competency ${compId}`,
        description: '',
        univAvg: 72,
        rawPoints: 0,
        maxPoints: 0,
        questionCount: 0,
        answeredCount: 0,
      };
    }

    const item = competencyMap[compId];
    item.questionCount += 1;
    item.maxPoints += 5;

    const answerVal = answers[q.id];
    if (answerVal !== undefined && answerVal !== null) {
      const adjusted = getAdjustedQuestionScore(answerVal, q.isReverse);
      item.rawPoints += adjusted;
      item.answeredCount += 1;
      totalRawPoints += adjusted;
      totalAnsweredCount += 1;
    }
    // Unanswered questions strictly receive 0 points (never defaulting to 3 / 50%)

    totalPossiblePoints += 5;
  });

  const competencyScores: CompetencyScore[] = Object.values(competencyMap).map((c) => {
    let score = 0;
    if (c.answeredCount > 0 && c.questionCount > 0) {
      const earnedPoints = Math.max(0, c.rawPoints - c.answeredCount);
      const maxEarnablePoints = c.questionCount * 4;
      score = maxEarnablePoints > 0
        ? Math.max(0, Math.min(100, Math.round((earnedPoints / maxEarnablePoints) * 100)))
        : 0;
    }

    const levelInfo = getCompetencyLevel(score);
    return {
      id: c.id,
      name: c.name,
      score,
      rawPoints: c.rawPoints,
      maxPoints: c.maxPoints,
      univAvg: c.univAvg,
      level: levelInfo.level,
      levelName: levelInfo.name,
      levelLabel: levelInfo.label,
      marks: levelInfo.marks,
      descriptor: levelInfo.descriptor,
      levelColor: levelInfo.color,
      levelBg: levelInfo.bg,
      trend: score >= c.univAvg ? 'up' : 'down',
    };
  });

  let compositeScore = 0.0;
  const totalQuestions = questions.length;
  if (totalAnsweredCount > 0 && totalQuestions > 0) {
    const totalEarnedPoints = Math.max(0, totalRawPoints - totalAnsweredCount);
    const totalMaxEarnablePoints = totalQuestions * 4;
    compositeScore = totalMaxEarnablePoints > 0
      ? Number(Math.max(0, Math.min(100, (totalEarnedPoints / totalMaxEarnablePoints) * 100)).toFixed(1))
      : 0.0;
  }

  const isCertified = compositeScore >= config.scoring.certificationThreshold;
  const certificationStatus = isCertified ? 'Certified' : 'Needs Improvement';

  const sorted = [...competencyScores].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const developmentAreas = [...competencyScores].sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    compositeScore,
    totalRawPoints,
    totalPossiblePoints,
    isCertified,
    certificationStatus,
    competencyScores,
    strengths,
    developmentAreas,
    evaluatedAt: new Date().toISOString(),
  };
}
