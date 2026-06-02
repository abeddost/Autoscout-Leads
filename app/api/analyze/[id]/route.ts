import { NextResponse } from 'next/server'
import { analyzeCarWithGemini } from '@/lib/gemini/analyze'
import { createServiceClient } from '@/lib/supabase/server'
import type { CarLead } from '@/lib/supabase/types'
import type { MarketValuation } from '@/lib/valuation/market'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: carRow, error: fetchError } = await supabase
    .from('car_leads')
    .select('*')
    .eq('id', id)
    .single()

  const car = carRow as CarLead | null
  if (fetchError || !car) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const existingValuation: MarketValuation | undefined =
    car.estimated_market_value != null && car.potential_profit != null && car.deal_score != null
      ? {
          estimated_market_value: car.estimated_market_value,
          potential_profit: car.potential_profit,
          deal_score: car.deal_score,
          risk_score: car.risk_score ?? 50,
          ai_summary: car.ai_summary ?? '',
          ai_recommendation: car.ai_recommendation ?? '',
          valuation_confidence: car.valuation_confidence ?? 'legacy',
          comparable_count: car.comparable_count ?? 0,
          comparable_median_price: car.comparable_median_price ?? null,
          comparable_price_min: car.comparable_price_min ?? null,
          comparable_price_max: car.comparable_price_max ?? null,
          discount_percentage: car.estimated_market_value > 0
            ? Math.round((car.potential_profit / car.estimated_market_value) * 1000) / 10
            : 0,
          valuation_method: car.valuation_method ?? 'existing saved lead valuation',
        }
      : undefined

  const analysis = await analyzeCarWithGemini(car, existingValuation)
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('car_leads')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      estimated_market_value: analysis.estimated_market_value,
      potential_profit: analysis.potential_profit,
      deal_score: analysis.deal_score,
      risk_score: analysis.risk_score,
      ai_summary: analysis.ai_summary,
      ai_recommendation: analysis.ai_recommendation,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, analysis })
}
