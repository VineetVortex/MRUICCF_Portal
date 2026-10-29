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
  let totalAnsweredCount = 0;
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
      totalAnsweredCount += 1;
    }
    // Note: Unanswered questions receive 0 raw points and 0 answeredCount (never defaulting to 3/50%)

    totalPossiblePoints += 5;
  });

  // Calculate per-competency score using Master Questionnaire Normalization:
  // Base raw score ranges from 1 to 5 per answered item.
  // Net earned proficiency points = rawPoints - answeredCount (0 to 4 per item).
  // Normalized score (%) = (earnedPoints / (questionCount * 4)) * 100.
  // If answeredCount === 0, score is strictly 0%.
  const competencyScores = Object.values(competencyMap).map((c) => {
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
      answeredCount: c.answeredCount,
      questionCount: c.questionCount,
    };
  });

  // Composite score across all competencies:
  // If totalAnsweredCount === 0, compositeScore is strictly 0.0 (never 50%).
  let compositeScore = 0.0;
  const totalQuestions = questions.length;
  if (totalAnsweredCount > 0 && totalQuestions > 0) {
    const totalEarnedPoints = Math.max(0, totalRawPoints - totalAnsweredCount);
    const totalMaxEarnablePoints = totalQuestions * 4;
    compositeScore = totalMaxEarnablePoints > 0
      ? Number(Math.max(0, Math.min(100, (totalEarnedPoints / totalMaxEarnablePoints) * 100)).toFixed(1))
      : 0.0;
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
    totalAnsweredCount,
    totalQuestions,
    isCertified,
    certificationStatus: isCertified ? 'Certified' : 'Needs Improvement',
    competencyScores,
    strengths,
    developmentAreas,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Evaluates an individual human-centric skill questionnaire (10 questions).
 * Strictly guarantees 0% score when 0 questions are answered.
 *
 * @param {Array} skillQuestions - 10 questions for this specific competency
 * @param {Object} answers - Map of { [questionId]: answerValue (1-5) }
 * @param {Object} competency - Competency metadata ({ id, name, description, univAvg })
 * @returns {Object} Full single-skill evaluation result
 */
export function calculateSingleSkillResults(skillQuestions, answers, competency) {
  let rawPoints = 0;
  let answeredCount = 0;
  const questionCount = skillQuestions.length;

  const questionBreakdown = skillQuestions.map((q) => {
    const rawVal = answers[q.id];
    const isAnswered = rawVal !== undefined && rawVal !== null;
    let adjusted = null;
    if (isAnswered) {
      adjusted = getAdjustedQuestionScore(rawVal, q.isReverse);
      rawPoints += adjusted;
      answeredCount += 1;
    }
    return {
      id: q.id,
      text: q.text,
      isReverse: Boolean(q.isReverse),
      rawAnswer: isAnswered ? rawVal : null,
      adjustedScore: adjusted,
      isAnswered,
    };
  });

  // Calculate score (0-100%). Strictly 0 if answeredCount === 0.
  let score = 0;
  if (answeredCount > 0 && questionCount > 0) {
    const earnedPoints = Math.max(0, rawPoints - answeredCount);
    const maxEarnablePoints = questionCount * 4;
    score = maxEarnablePoints > 0
      ? Math.max(0, Math.min(100, Math.round((earnedPoints / maxEarnablePoints) * 100)))
      : 0;
  }

  const levelInfo = getCompetencyLevel(score);
  const isCertified = score >= CERTIFICATION_THRESHOLD;

  const competencyScore = {
    id: competency?.id || 1,
    name: competency?.name || 'Competency',
    score,
    rawPoints,
    maxPoints: questionCount * 5,
    univAvg: competency?.univAvg || 72,
    level: levelInfo.level,
    levelName: levelInfo.name,
    levelLabel: levelInfo.label,
    marks: levelInfo.marks,
    descriptor: levelInfo.descriptor,
    levelColor: levelInfo.color,
    levelBg: levelInfo.bg,
    trend: score >= (competency?.univAvg || 72) ? 'up' : 'down',
    answeredCount,
    questionCount,
  };

  return {
    skillId: competency?.id || 1,
    skillName: competency?.name || 'Competency',
    score,
    overallScore: score,
    compositeScore: score,
    rawPoints,
    answeredCount,
    totalQuestions: questionCount,
    level: levelInfo.level,
    levelInfo,
    isCertified,
    certificationStatus: isCertified ? 'Certified' : 'Needs Improvement',
    competencyScore,
    competencyScores: [competencyScore],
    strengths: [competencyScore],
    developmentAreas: isCertified ? [] : [competencyScore],
    questionBreakdown,
    evaluatedAt: new Date().toISOString(),
  };
}
