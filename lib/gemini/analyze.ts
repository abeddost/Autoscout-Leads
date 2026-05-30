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

export async function analyzeCarWithGemini(car: Partial<CarLead>): Promise<GeminiAnalysis | null> {
  try {
    const client = getClient()

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: ANALYSIS_PROMPT(car),
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    })

    const text = response.text
    if (!text) return null

    const parsed = JSON.parse(text) as GeminiAnalysis

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
