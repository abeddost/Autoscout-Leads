import { GoogleGenAI } from '@google/genai'
import type { CarLead } from '@/lib/supabase/types'
import type { MarketValuation } from '@/lib/valuation/market'

export interface GeminiAnalysis {
  estimated_market_value: number
  potential_profit: number
  deal_score: number
  risk_score: number
  ai_summary: string
  ai_recommendation: string
}

export type GeminiAnalysisErrorKind = 'quota' | 'config' | 'output'

export class GeminiAnalysisError extends Error {
  constructor(
    public kind: GeminiAnalysisErrorKind,
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = 'GeminiAnalysisError'
  }
}

export function isGeminiAnalysisError(err: unknown): err is GeminiAnalysisError {
  return err instanceof GeminiAnalysisError
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}

const ANALYSIS_PROMPT = (car: Partial<CarLead>, valuation?: MarketValuation) => `
You are an expert German used car market analyst. Analyze the following private car listing from AutoScout24.de and provide a structured JSON response.

Car Details:
- Brand: ${car.brand}
- Model: ${car.model}
- Year: ${car.year}
- Mileage: ${car.mileage ? car.mileage + ' km' : 'Unknown'}
- Fuel Type: ${car.fuel_type || 'Unknown'}
- Transmission: ${car.transmission || 'Unknown'}
- Horsepower: ${car.horsepower ? car.horsepower + ' PS' : 'Unknown'}
- Listed Price: €${car.price?.toLocaleString('de-DE')}
- Location PLZ: ${car.plz || 'Unknown'}, ${car.city || 'Germany'}
- Seller Type: Private seller
- Accident History: ${car.accident_info || 'Not specified'}
- Number of Previous Owners: ${car.number_of_owners ?? 'Unknown'}
- Equipment/Options: ${Array.isArray(car.equipment) && car.equipment.length > 0 ? car.equipment.slice(0, 20).join(', ') : 'Not listed'}

Market evidence computed by the app from the current AutoScout scrape:
- Estimated market value: €${valuation?.estimated_market_value?.toLocaleString('de-DE') ?? car.estimated_market_value?.toLocaleString('de-DE') ?? 'Unknown'}
- Listed price: €${car.price?.toLocaleString('de-DE')}
- Potential profit: €${valuation?.potential_profit?.toLocaleString('de-DE') ?? car.potential_profit?.toLocaleString('de-DE') ?? 'Unknown'}
- Deal score: ${valuation?.deal_score ?? car.deal_score ?? 'Unknown'}/100
- Valuation confidence: ${valuation?.valuation_confidence ?? car.valuation_confidence ?? 'Unknown'}
- Comparable count: ${valuation?.comparable_count ?? 'Unknown'}
- Comparable median price: ${valuation?.comparable_median_price ? `€${valuation.comparable_median_price.toLocaleString('de-DE')}` : 'Unknown'}
- Comparable price range: ${valuation?.comparable_price_min != null && valuation.comparable_price_max != null ? `€${valuation.comparable_price_min.toLocaleString('de-DE')} to €${valuation.comparable_price_max.toLocaleString('de-DE')}` : 'Unknown'}
- Discount versus evidence value: ${valuation?.discount_percentage ?? 'Unknown'}%
- Valuation method: ${valuation?.valuation_method ?? 'Unknown'}

Important: Do not invent a different market value, profit, or deal score. Use the computed market evidence above. Your job is to identify qualitative risks, summarize why the computed evidence is or is not attractive, and recommend a next action.
${valuation?.valuation_confidence === 'weak' ? 'Weak confidence rule: the recommendation must start with Consider or Pass, and it must explicitly mention weak comparable evidence.' : ''}

RISK SCORE (0 = no risk, 100 = very risky): consider mileage, accident history, owners, age, uncommon spec, weak comparable evidence, and missing details.

Respond ONLY with this exact JSON (no markdown, no explanation outside the JSON):
{
  "estimated_market_value": ${valuation?.estimated_market_value ?? '<integer euros from computed evidence>'},
  "potential_profit": ${valuation?.potential_profit ?? '<integer euros from computed evidence>'},
  "deal_score": ${valuation?.deal_score ?? '<integer 0-100 from computed evidence>'},
  "risk_score": <integer 0–100>,
  "ai_summary": "<2–3 sentences: mention the computed valuation evidence, explain why this is or isn't a deal, mention the key positive and negative factors>",
  "ai_recommendation": "<Start with exactly one of: 'Strong Buy', 'Buy', 'Consider', 'Pass'. Then one sentence with the single most important reason.>"
}
`

function normalizeRecommendation(recommendation: string | undefined, valuation?: MarketValuation): string {
  const cleaned = (recommendation || '').trim()
  if (valuation?.valuation_confidence !== 'weak') return cleaned.slice(0, 300)

  if (!cleaned || /^(strong buy|buy)\b/i.test(cleaned)) {
    return 'Consider - weak comparable evidence; verify the market value before contacting the seller.'
  }

  if (!/^(consider|pass)\b/i.test(cleaned)) {
    return 'Consider - weak comparable evidence; verify the market value before contacting the seller.'
  }

  if (!/(weak|comparable|evidence|confidence)/i.test(cleaned)) {
    return `${cleaned.replace(/[. ]+$/, '')}. Weak comparable evidence needs manual verification.`.slice(0, 300)
  }

  return cleaned.slice(0, 300)
}

let geminiClient: GoogleGenAI | null = null

function getClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  }
  return geminiClient
}

function getErrorStatus(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: unknown }).status)
    : undefined
}

function getErrorText(err: unknown): string {
  if (err instanceof Error) return err.message

  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function classifyGeminiError(err: unknown, model: string): GeminiAnalysisError | null {
  const status = getErrorStatus(err)
  const message = getErrorText(err)
  const lower = message.toLowerCase()

  if (
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return new GeminiAnalysisError(
      'quota',
      `Gemini quota exceeded for ${model}. Check billing/rate limits or set GEMINI_MODEL.`,
      status
    )
  }

  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid_argument') ||
    lower.includes('not found')
  ) {
    return new GeminiAnalysisError(
      'config',
      `Gemini configuration failed for ${model}. Check GEMINI_API_KEY, billing, and GEMINI_MODEL.`,
      status
    )
  }

  return null
}

function getFinishReason(response: unknown): string | null {
  if (typeof response !== 'object' || response === null || !('candidates' in response)) return null

  const candidates = (response as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return null

  const firstCandidate = candidates[0]
  if (typeof firstCandidate !== 'object' || firstCandidate === null || !('finishReason' in firstCandidate)) {
    return null
  }

  const finishReason = (firstCandidate as { finishReason?: unknown }).finishReason
  return typeof finishReason === 'string' ? finishReason : null
}

export async function analyzeCarWithGemini(
  car: Partial<CarLead>,
  valuation?: MarketValuation
): Promise<GeminiAnalysis | null> {
  const model = getGeminiModel()

  try {
    const client = getClient()

    const response = await client.models.generateContent({
      model,
      contents: ANALYSIS_PROMPT(car, valuation),
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 3000,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    })

    const finishReason = getFinishReason(response)
    if (finishReason === 'MAX_TOKENS') {
      throw new GeminiAnalysisError(
        'output',
        `Gemini response was truncated for ${model} with finish reason ${finishReason}. Increase maxOutputTokens or disable thinking.`
      )
    }

    const text = response.text
    if (!text) return null

    let parsed: GeminiAnalysis
    try {
      parsed = JSON.parse(text) as GeminiAnalysis
    } catch {
      throw new GeminiAnalysisError(
        'output',
        'Gemini returned malformed JSON. The listing was not analyzed.'
      )
    }

    const parsedRisk = Number.isFinite(Number(parsed.risk_score))
      ? Number(parsed.risk_score)
      : valuation?.risk_score ?? 50

    // Validate and clamp scores. When deterministic valuation evidence is provided,
    // Gemini is only allowed to add narrative and raise risk, not change the valuation.
    return {
      estimated_market_value: valuation?.estimated_market_value ?? Math.max(0, Math.round(parsed.estimated_market_value)),
      potential_profit: valuation?.potential_profit ?? Math.round(parsed.potential_profit),
      deal_score: valuation?.deal_score ?? Math.min(100, Math.max(0, Math.round(parsed.deal_score))),
      risk_score: Math.min(
        100,
        Math.max(0, Math.round(Math.max(valuation?.risk_score ?? 0, parsedRisk)))
      ),
      ai_summary: parsed.ai_summary?.slice(0, 1000) || '',
      ai_recommendation: normalizeRecommendation(parsed.ai_recommendation, valuation),
    }
  } catch (err) {
    if (err instanceof GeminiAnalysisError) throw err

    const analysisError = classifyGeminiError(err, model)
    if (analysisError) throw analysisError

    console.error('Gemini analysis error:', err)
    return null
  }
}

export function meetsLeadThreshold(analysis: GeminiAnalysis, price: number): boolean {
  return (
    analysis.deal_score >= 80 &&
    analysis.potential_profit >= 2000 &&
    price >= 10000 &&
    price <= 70000
  )
}
