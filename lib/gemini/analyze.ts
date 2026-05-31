import { GoogleGenAI } from '@google/genai'
import type { CarLead } from '@/lib/supabase/types'

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

const ANALYSIS_PROMPT = (car: Partial<CarLead>) => `
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

Market context: German used car market, May 2025. Consider regional pricing near Mainz/Rhein-Main area (PLZ 55294, Bodenheim).

Scoring factors:
1. Price relative to current German market value for this exact spec (30% weight)
2. Mileage relative to average for the age (20% weight)
3. Age of the vehicle (15% weight)
4. Brand and model resale demand in Germany (15% weight)
5. Equipment and options package (10% weight)
6. Seller type, accident history, number of owners (10% weight)

Risk factors to consider: high mileage, accident history, many owners, uncommon spec, low resale demand.

Respond ONLY with this exact JSON structure (no markdown, no explanation):
{
  "estimated_market_value": <number in euros, integer>,
  "potential_profit": <estimated_market_value minus listed price, integer>,
  "deal_score": <0-100 integer, where 100 is an exceptional deal>,
  "risk_score": <0-100 integer, where 0 is lowest risk>,
  "ai_summary": "<2-3 sentences analyzing this specific car's value proposition in the German market>",
  "ai_recommendation": "<Start with one of: 'Strong Buy', 'Buy', 'Consider', 'Pass'. Then one sentence with the key reason.>"
}
`

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

export async function analyzeCarWithGemini(car: Partial<CarLead>): Promise<GeminiAnalysis | null> {
  const model = getGeminiModel()

  try {
    const client = getClient()

    const response = await client.models.generateContent({
      model,
      contents: ANALYSIS_PROMPT(car),
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 1500,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    })

    const finishReason = getFinishReason(response)
    if (finishReason === 'MAX_TOKENS') {
      throw new GeminiAnalysisError(
        'output',
        'Gemini response was truncated. Increase maxOutputTokens or disable thinking.'
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

    // Validate and clamp scores
    return {
      estimated_market_value: Math.max(0, Math.round(parsed.estimated_market_value)),
      potential_profit: Math.round(parsed.potential_profit),
      deal_score: Math.min(100, Math.max(0, Math.round(parsed.deal_score))),
      risk_score: Math.min(100, Math.max(0, Math.round(parsed.risk_score))),
      ai_summary: parsed.ai_summary?.slice(0, 1000) || '',
      ai_recommendation: parsed.ai_recommendation?.slice(0, 300) || '',
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
    price >= 20000 &&
    price <= 70000
  )
}
