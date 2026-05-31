import { NextResponse } from 'next/server'
import { MAX_AI_ANALYSIS_PER_RUN, scrapeAutoScout24, shouldAnalyzeListingCandidate } from '@/lib/scraper/autoscout24'
import { analyzeCarWithGemini, isGeminiAnalysisError, meetsLeadThreshold } from '@/lib/gemini/analyze'
import { createServiceClient } from '@/lib/supabase/server'

function verifySecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const errors: string[] = []
  let totalChecked = 0
  let totalSaved = 0
  let totalCandidates = 0
  let fatalError: string | null = null
  let fatalStatus = 500

  try {
    console.log('[scrape] Starting AutoScout24 scrape…')
    const { listings, checked, errors: scrapeErrors } = await scrapeAutoScout24()
    totalChecked = checked
    errors.push(...scrapeErrors)

    console.log(`[scrape] Found ${listings.length} raw listings from ${checked} checked`)

    const candidates = listings
      .filter(shouldAnalyzeListingCandidate)
      .slice(0, MAX_AI_ANALYSIS_PER_RUN)
    totalCandidates = candidates.length

    console.log(`[scrape] Analyzing ${totalCandidates} pre-filtered candidates with Gemini`)

    for (const listing of candidates) {
      try {
        // Skip if listing_url already exists
        const { data: existing } = await supabase
          .from('car_leads')
          .select('id')
          .eq('listing_url', listing.listing_url)
          .single()

        if (existing) continue

        // Run Gemini analysis
        const analysis = await analyzeCarWithGemini(listing)
        if (!analysis) continue

        // Apply lead filter thresholds
        if (!meetsLeadThreshold(analysis, listing.price)) continue

        // Check for accident — skip major accidents
        const accidentLower = (listing.accident_info || '').toLowerCase()
        if (
          accidentLower.includes('unfallschaden') ||
          accidentLower.includes('accident reported') ||
          accidentLower.includes('damaged')
        ) {
          continue
        }

        // Save to Supabase
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
          status: 'new',
        })

        if (insertError) {
          errors.push(`Insert error for ${listing.listing_url}: ${insertError.message}`)
        } else {
          totalSaved++
        }
      } catch (err) {
        if (isGeminiAnalysisError(err)) {
          fatalError = err.message
          fatalStatus = err.kind === 'quota' ? 429 : 500
          errors.push(err.message)
          console.error('[scrape] Stopping due to Gemini error:', err.message)
          break
        }

        errors.push(`Processing error: ${String(err)}`)
      }
    }

    // Log to search_logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('search_logs').insert({
      search_date: new Date().toISOString().split('T')[0],
      source_website: 'autoscout24',
      total_listings_checked: totalChecked,
      total_leads_saved: totalSaved,
      errors: errors.slice(0, 20),
    })

    console.log(`[scrape] Done. Saved ${totalSaved} leads.`)

    if (fatalError) {
      return NextResponse.json({
        error: fatalError,
        checked: totalChecked,
        candidates: totalCandidates,
        saved: totalSaved,
        errors: errors.slice(0, 10),
      }, { status: fatalStatus })
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      candidates: totalCandidates,
      saved: totalSaved,
      errors: errors.slice(0, 10),
    })
  } catch (err) {
    console.error('[scrape] Fatal error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
