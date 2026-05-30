import { NextResponse } from 'next/server'
import { analyzeCarWithGemini } from '@/lib/gemini/analyze'
import { createServiceClient } from '@/lib/supabase/server'
import type { CarLead } from '@/lib/supabase/types'

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

  const analysis = await analyzeCarWithGemini(car)
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
