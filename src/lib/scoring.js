/**
 * Assessment Scoring Engine
 * Adheres strictly to COMPLETE_DOCUMENTATION.md & Skill Framework Questionnaire Master Copy.docx
 */

export const CERTIFICATION_THRESHOLD = 65.0; // 65.00% minimum passing and certificate eligibility requirement

/**
 * Returns official performance level (L1 - L5), marks (0-4), and behavioral descriptor
 * based on the Skill Framework Questionnaire Master Copy interpretation bands:
 * Level 5: 85–100% (Marks: 4)
 * Level 4: 70–84%  (Marks: 3)
 * Level 3: 55–69%  (Marks: 2)
 * Level 2: 40–54%  (Marks: 1)
 * Level 1: < 40%   (Marks: 0)
 */
export function getCompetencyLevel(percentage) {
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

/**
 * Normalizes a Likert score (1-5).
 * Reverse-worded questions are inverted: invertedScore = 6 - answer.
 */
export function getAdjustedQuestionScore(answerValue, isReverse = false) {
  const val = Number(answerValue) || 3;
  if (isReverse) {
    return 6 - val;
  }
  return val;
}

/**
 * Evaluates an assessment attempt.
 *
 * @param {Array} questions - Array of questions evaluated
 * @param {Object} answers - Map of { [questionId]: answerValue (1-5) }
 * @param {Array} competencies - Master list of competency definitions
 * @returns {Object} Full scoring result including per-competency percentages, levels, composite score, and certification
 */
export function calculateAttemptResults(questions, answers, competencies) {
  let totalRawPoints = 0;
  let totalPossiblePoints = 0;

  // Group questions by competency
  const competencyMap = {};
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
    const compId = q.skillId || q.competencyId;
    if (!competencyMap[compId]) {
      competencyMap[compId] = {
        id: compId,
        name: q.skillName || `Competency ${compId}`,
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
    } else {
      // Default unanswered to neutral (3)
      const adjusted = getAdjustedQuestionScore(3, q.isReverse);
      item.rawPoints += adjusted;
      totalRawPoints += adjusted;
    }

    totalPossiblePoints += 5;
  });

  // Calculate per-competency score using Master Questionnaire Normalization: (raw - 10) / 40 * 100
  const competencyScores = Object.values(competencyMap).map((c) => {
    let score;
    if (c.questionCount === 10) {
      score = Math.max(0, Math.min(100, Math.round(((c.rawPoints - 10) / 40) * 100)));
    } else {
      const minPoints = c.questionCount * 1;
      const pointRange = (c.questionCount * 5) - minPoints;
      score = pointRange > 0 ? Math.max(0, Math.min(100, Math.round(((c.rawPoints - minPoints) / pointRange) * 100))) : 0;
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

  // Composite score across all competencies using Master Questionnaire Normalization: (total - 150) / 600 * 100
  let compositeScore;
  const totalQuestions = questions.length;
  if (totalQuestions === 150) {
    compositeScore = Number(Math.max(0, Math.min(100, ((totalRawPoints - 150) / 600) * 100)).toFixed(1));
  } else {
    const minRaw = totalQuestions * 1;
    const rawRange = (totalQuestions * 5) - minRaw;
    compositeScore = rawRange > 0 
      ? Number(Math.max(0, Math.min(100, ((totalRawPoints - minRaw) / rawRange) * 100)).toFixed(1))
      : 0;
  }

  const isCertified = compositeScore >= CERTIFICATION_THRESHOLD;

  // Identify strengths (top 3) and development areas (lowest 3)
  const sorted = [...competencyScores].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3);
  const developmentAreas = [...competencyScores].sort((a, b) => a.score - b.score).slice(0, 3);

  return {
    compositeScore,
    totalRawPoints,
    totalPossiblePoints,
    isCertified,
    certificationStatus: isCertified ? 'Certified' : 'Needs Improvement',
    competencyScores,
    strengths,
    developmentAreas,
    evaluatedAt: new Date().toISOString(),
  };
}
