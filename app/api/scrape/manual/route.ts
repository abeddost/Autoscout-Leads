import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  MAX_AI_ANALYSIS_PER_RUN,
  hasCandidateMarketProfile,
  hasSellerPhone,
  scrapeAutoScout24,
} from '@/lib/scraper/autoscout24'
import { analyzeCarWithGemini, isGeminiAnalysisError } from '@/lib/gemini/analyze'
import { estimateMarketValuation, meetsValuationThreshold } from '@/lib/valuation/market'

export async function POST(request: Request) {
  // Verify the user is logged in via their session cookie
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify scrape password
  const scrapePassword = request.headers.get('x-scrape-password')
  if (!scrapePassword || scrapePassword !== process.env.SCRAPE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const errors: string[] = []
  let totalChecked = 0
  let totalSaved = 0
  let totalCandidates = 0
  let fatalError: string | null = null
  let fatalStatus = 500
  const skipCounts = {
    duplicate: 0,
    no_analysis: 0,
    below_threshold: 0,
    accident: 0,
    insert_error: 0,
    no_phone: 0,
    not_profitable: 0,
    weak_evidence: 0,
  }

  try {
    console.log('[manual-scrape] Starting AutoScout24 scrape…')
    const { listings, checked, errors: scrapeErrors } = await scrapeAutoScout24()
    totalChecked = checked
    errors.push(...scrapeErrors)

    console.log(`[manual-scrape] Found ${listings.length} raw listings from ${checked} checked`)

    const marketCandidates = listings.filter(hasCandidateMarketProfile)
    skipCounts.no_phone = marketCandidates.filter((listing) => !hasSellerPhone(listing)).length

    const candidates = marketCandidates
      .filter(hasSellerPhone)
      .slice(0, MAX_AI_ANALYSIS_PER_RUN)
    totalCandidates = candidates.length

    console.log(`[manual-scrape] Valuing ${totalCandidates} pre-filtered candidates before Gemini`)

    for (const listing of candidates) {
      try {
        const { data: existing } = await supabase
          .from('car_leads')
          .select('id')
          .eq('listing_url', listing.listing_url)
          .single()

        if (existing) {
          skipCounts.duplicate++
          continue
        }

        const valuation = estimateMarketValuation(listing, listings)

        if (valuation.potential_profit < 2000) {
          skipCounts.not_profitable++
          continue
        }

        if (!meetsValuationThreshold(valuation, listing.price)) {
          skipCounts.below_threshold++
          continue
        }

        const accidentLower = (listing.accident_info || '').toLowerCase()
        if (
          accidentLower.includes('unfallschaden') ||
          accidentLower.includes('accident reported') ||
          accidentLower.includes('damaged')
        ) {
          skipCounts.accident++
          continue
        }

        if (valuation.evidence_strength === 'weak') {
          skipCounts.weak_evidence++
        }

        const analysis = await analyzeCarWithGemini(listing, valuation)
        if (!analysis) {
          skipCounts.no_analysis++
          continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await supabase.from('car_leads').insert({
          date_found: new Date().toISOString().split('T')[0],
          seller_name: listing.seller_name,
          seller_mobile: listing.seller_mobile,
          seller_email: listing.seller_email,
          plz: listing.plz,
          city: listing.city,
          vehicle_title: listing.vehicle_title,
          brand: listing.brand,
          model: listing.model,
          year: listing.year,
          mileage: listing.mileage,
          fuel_type: listing.fuel_type,
          transmission: listing.transmission,
          horsepower: listing.horsepower,
          price: listing.price,
          estimated_market_value: analysis.estimated_market_value,
          potential_profit: analysis.potential_profit,
          deal_score: analysis.deal_score,
          risk_score: analysis.risk_score,
          seller_type: listing.seller_type,
          accident_info: listing.accident_info,
          number_of_owners: listing.number_of_owners,
          equipment: listing.equipment,
          listing_url: listing.listing_url,
          image_urls: listing.image_urls,
          ai_summary: analysis.ai_summary,
          ai_recommendation: analysis.ai_recommendation,
          source_website: listing.source_website,
          listing_date: listing.listing_date ?? null,
          status: 'new',
        } as any)

        if (insertError) {
          skipCounts.insert_error++
          errors.push(`Insert error: ${insertError.message}`)
        } else {
          totalSaved++
        }
      } catch (err) {
        if (isGeminiAnalysisError(err)) {
          fatalError = err.message
          fatalStatus = err.kind === 'quota' ? 429 : err.kind === 'output' ? 502 : 500
          errors.push(err.message)
          console.error('[manual-scrape] Stopping due to Gemini error:', err.message)
          break
        }

        errors.push(`Processing error: ${String(err)}`)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('search_logs').insert({
      search_date: new Date().toISOString().split('T')[0],
      source_website: 'autoscout24',
      total_listings_checked: totalChecked,
      total_leads_saved: totalSaved,
      errors: errors.slice(0, 20),
    } as any)

    console.log(`[manual-scrape] Done. Saved ${totalSaved} leads.`)

    if (fatalError) {
      return NextResponse.json({
        error: fatalError,
        checked: totalChecked,
        candidates: totalCandidates,
        saved: totalSaved,
        skipCounts,
        errors: errors.slice(0, 10),
      }, { status: fatalStatus })
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      candidates: totalCandidates,
      saved: totalSaved,
      skipCounts,
      errors: errors.slice(0, 10),
    })
  } catch (err) {
    console.error('[manual-scrape] Fatal error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
