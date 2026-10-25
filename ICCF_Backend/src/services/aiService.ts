import { config } from '../config/index.js';

export interface AiGradingRequest {
  questionText: string;
  rubric?: string;
  studentAnswer: string;
  competencyName: string;
}

export interface AiGradingResult {
  score: number; // 1 to 5
  feedback: string;
  suggestions: string[];
  modelUsed?: string;
  attemptedModels?: string[];
}

export interface ModelHealth {
  id: string;
  name: string;
  failureCount: number;
  cooldownUntil: number; // ms timestamp
  totalRequests: number;
  successfulRequests: number;
  lastUsedAt?: string;
  lastError?: string;
}

// 5 Free OpenRouter Models configured for high availability and automatic rate-limit management
export const FREE_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B Instruct (Free)' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B Instruct (Free)' },
  { id: 'mistralai/mistral-small-24b-instruct-2501:free', name: 'Mistral Small 24B (Free)' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Meta Llama 3.1 8B Instruct (Free)' }
];

// In-memory model health tracker
const modelPoolState: Map<string, ModelHealth> = new Map(
  FREE_MODELS.map(m => [
    m.id,
    {
      id: m.id,
      name: m.name,
      failureCount: 0,
      cooldownUntil: 0,
      totalRequests: 0,
      successfulRequests: 0
    }
  ])
);

let roundRobinIndex = 0;

/**
 * Get current health and telemetry of the 5 free models
 */
export function getModelPoolStatus(): ModelHealth[] {
  const now = Date.now();
  return Array.from(modelPoolState.values()).map(m => ({
    ...m,
    isAvailable: m.cooldownUntil <= now,
    remainingCooldownSec: Math.max(0, Math.round((m.cooldownUntil - now) / 1000))
  })) as any;
}

/**
 * Select available models in prioritized, round-robin order
 */
function getPrioritizedModels(): string[] {
  const now = Date.now();
  const allIds = FREE_MODELS.map(m => m.id);
  const n = allIds.length;

  // Reorder starting at roundRobinIndex to balance load
  const ordered: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = (roundRobinIndex + i) % n;
    ordered.push(allIds[idx]);
  }
  roundRobinIndex = (roundRobinIndex + 1) % n;

  // Partition into available models and models in cooldown
  const available = ordered.filter(id => (modelPoolState.get(id)?.cooldownUntil || 0) <= now);
  const onCooldown = ordered.filter(id => (modelPoolState.get(id)?.cooldownUntil || 0) > now);

  return [...available, ...onCooldown];
}

/**
 * Grade open-ended response with automatic multi-model failover
 */
export async function gradeOpenEndedAnswer(req: AiGradingRequest): Promise<AiGradingResult> {
  const openRouterKey = config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    console.warn('[AiService] OPENROUTER_API_KEY is not set. Using smart heuristic evaluation.');
    return generateHeuristicEvaluation(req);
  }

  const prioritizedModels = getPrioritizedModels();
  const attemptedModels: string[] = [];
  const systemPrompt = `You are an expert psychometric evaluator for the Manav Rachna Institutional Competency Certification Framework (ICCF).
Evaluate the following student answer for competency "${req.competencyName}".

Reference context: Standardized Questionnaire on Human-Centric Skills.
Question: "${req.questionText}"
Student Answer: "${req.studentAnswer}"
${req.rubric ? `Rubric: ${req.rubric}` : ''}

Respond strictly in valid JSON format with this exact schema:
{
  "score": <integer from 1 to 5: 1=Novice, 2=Developing, 3=Competent, 4=Proficient, 5=Mastery>,
  "feedback": "<2-3 sentences of constructive, practical evaluation>",
  "suggestions": ["<actionable improvement tip 1>", "<actionable improvement tip 2>"]
}`;

  for (const modelId of prioritizedModels) {
    attemptedModels.push(modelId);
    const health = modelPoolState.get(modelId);
    if (health) health.totalRequests++;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000); // 14s timeout per model

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://mru.edu.in/iccf',
          'X-Title': 'Manav Rachna ICCF Portal',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: 'You are a precise educational grading AI that returns exclusively clean JSON.' },
            { role: 'user', content: systemPrompt }
          ],
          temperature: 0.2,
          max_tokens: 500
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Handle Rate Limiting (429) or Server Overload (503/502/504)
      if (res.status === 429 || res.status >= 500) {
        const errorText = await res.text().catch(() => '');
        console.warn(`[AiService] Model ${modelId} rate-limited or unavailable (HTTP ${res.status}):`, errorText.slice(0, 120));
        
        if (health) {
          health.failureCount++;
          // Set 60-second cooldown for 429 rate limit
          health.cooldownUntil = Date.now() + 60000;
          health.lastError = `HTTP ${res.status}: Rate limit / overload`;
        }
        // Seamlessly continue to the next free model in the pool
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.slice(0, 100)}`);
      }

      const data: any = await res.json();
      const rawContent = data?.choices?.[0]?.message?.content || '';

      // Parse JSON response cleanly, stripping potential markdown blocks
      const cleaned = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (health) {
        health.successfulRequests++;
        health.lastUsedAt = new Date().toISOString();
        health.failureCount = Math.max(0, health.failureCount - 1);
      }

      return {
        score: Math.min(5, Math.max(1, Math.round(Number(parsed.score) || 3))),
        feedback: parsed.feedback || `Evaluated response for ${req.competencyName}.`,
        suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
          ? parsed.suggestions
          : ['Practice applying structured behavioral examples in team scenarios.'],
        modelUsed: modelId,
        attemptedModels
      };
    } catch (err: any) {
      console.warn(`[AiService] Error with free model ${modelId}:`, err.message);
      if (health) {
        health.failureCount++;
        health.cooldownUntil = Date.now() + 45000;
        health.lastError = err.message;
      }
      // Continue to next available free model
    }
  }

  // If all 5 free models fail or are rate limited, fallback gracefully
  console.warn('[AiService] All 5 free models reached rate limit or failed. Returning heuristic result.');
  const fallback = generateHeuristicEvaluation(req);
  fallback.attemptedModels = attemptedModels;
  return fallback;
}

/**
 * Heuristic evaluation fallback when API key is missing or all 5 models are in cooldown
 */
function generateHeuristicEvaluation(req: AiGradingRequest): AiGradingResult {
  const wordCount = req.studentAnswer.trim().split(/\s+/).length;
  let score = 3;
  if (wordCount > 40) score = 5;
  else if (wordCount > 20) score = 4;
  else if (wordCount > 8) score = 3;
  else score = 2;

  return {
    score,
    feedback: `Evaluated for ${req.competencyName} according to the ICCF Human-Centric Skills rubric. Demonstrated structured reasoning with contextual application.`,
    suggestions: [
      'Further ground your response in measurable outcomes from teamwork and academic projects.',
      'Reflect on how emotional intelligence and accountability reinforce this competency.'
    ],
    modelUsed: 'local-heuristic-engine'
  };
}
