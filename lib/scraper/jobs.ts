import { scrapeAutoScout24, shouldAnalyzeListingCandidate } from '@/lib/scraper/autoscout24'
import type { RawListing } from '@/lib/scraper/types'
import { analyzeCarWithGemini, isGeminiAnalysisError, meetsLeadThreshold } from '@/lib/gemini/analyze'
import { createServiceClient } from '@/lib/supabase/server'
import type { ScrapeJob, ScrapeJobStatus } from '@/lib/supabase/types'

const DEFAULT_CHUNK_SIZE = 10
const MAX_STORED_ERRORS = 50
const STALE_SCRAPING_MS = 15 * 60 * 1000
const STALE_PROCESSING_MS = 15 * 60 * 1000

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

export interface ScrapeJobSummary {
  id: string
  status: ScrapeJobStatus
  checked: number
  candidates: number
  processed: number
  saved: number
  failed: number
  latestError: string | null
  errors: string[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

function getChunkSize() {
  const parsed = Number(process.env.SCRAPE_JOB_CHUNK_SIZE || DEFAULT_CHUNK_SIZE)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 50) : DEFAULT_CHUNK_SIZE
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

function appendErrors(existing: unknown, next: string[]) {
  const current = Array.isArray(existing) ? existing.filter((value): value is string => typeof value === 'string') : []
  return [...current, ...next].slice(0, MAX_STORED_ERRORS)
}

function toSummary(job: ScrapeJob): ScrapeJobSummary {
  return {
    id: job.id,
    status: job.status,
    checked: job.checked_count,
    candidates: job.candidate_count,
    processed: job.processed_count,
    saved: job.saved_count,
    failed: job.failed_count,
    latestError: job.latest_error,
    errors: Array.isArray(job.errors) ? job.errors : [],
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
  }
}

export async function createScrapeJob(createdBy: string | null = null): Promise<ScrapeJobSummary> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scrape_jobs')
    .insert({
      created_by: createdBy,
      source_website: 'autoscout24',
      status: 'queued',
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to create scrape job')
  return toSummary(data as ScrapeJob)
}

export async function getScrapeJob(jobId: string): Promise<ScrapeJobSummary | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) return null
  return toSummary(data as ScrapeJob)
}

export async function userCanAccessScrapeJob(jobId: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('id')
    .eq('id', jobId)
    .or(`created_by.eq.${userId},created_by.is.null`)
    .single()

  return Boolean(data && !error)
}

export async function findRunnableScrapeJob(): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('scrape_jobs')
    .select('id')
    .in('status', ['queued', 'scraping', 'analyzing'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as { id?: string } | null)?.id || null
}

function isStaleScrapingJob(job: ScrapeJob) {
  return job.status === 'scraping' && Date.now() - new Date(job.updated_at).getTime() > STALE_SCRAPING_MS
}

async function refreshJobCounts(supabase: SupabaseServiceClient, jobId: string) {
  const { data: items } = await supabase
    .from('scrape_job_items')
    .select('status')
    .eq('job_id', jobId)

  const rows = (items || []) as Array<{ status: string }>
  const saved = rows.filter((item) => item.status === 'saved').length
  const failed = rows.filter((item) => item.status === 'failed').length
  const skipped = rows.filter((item) => item.status === 'skipped').length
  const processed = saved + failed + skipped

  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({
      processed_count: processed,
      saved_count: saved,
      failed_count: failed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to refresh scrape job counts')
  return data as ScrapeJob
}

async function writeSearchLog(supabase: SupabaseServiceClient, job: ScrapeJob) {
  await supabase.from('search_logs').insert({
    search_date: todayIsoDate(),
    source_website: job.source_website || 'autoscout24',
    total_listings_checked: job.checked_count,
    total_leads_saved: job.saved_count,
    errors: Array.isArray(job.errors) ? job.errors.slice(0, 20) : [],
  })
}

async function completeIfDone(supabase: SupabaseServiceClient, jobId: string) {
  const refreshed = await refreshJobCounts(supabase, jobId)
  if (refreshed.processed_count < refreshed.candidate_count) return refreshed

  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to complete scrape job')
  await writeSearchLog(supabase, data as ScrapeJob)
  return data as ScrapeJob
}

async function failJob(supabase: SupabaseServiceClient, job: ScrapeJob, message: string) {
  const errors = appendErrors(job.errors, [message])
  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'failed',
      latest_error: message,
      errors,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || message)
  const refreshed = await refreshJobCounts(supabase, job.id)
  await writeSearchLog(supabase, refreshed)
  return refreshed
}

async function discoverCandidates(supabase: SupabaseServiceClient, job: ScrapeJob) {
  await supabase
    .from('scrape_jobs')
    .update({
      status: 'scraping',
      started_at: job.started_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  const { listings, checked, errors } = await scrapeAutoScout24()
  const candidates = listings.filter(shouldAnalyzeListingCandidate)
  const itemRows = candidates.map((listing) => ({
    job_id: job.id,
    listing_url: listing.listing_url,
    raw_listing: listing,
    status: 'pending',
  }))

  if (itemRows.length > 0) {
    const { error: insertError } = await supabase
      .from('scrape_job_items')
      .upsert(itemRows, { onConflict: 'job_id,listing_url', ignoreDuplicates: true })

    if (insertError) throw new Error(insertError.message)
  }

  const nextStatus = candidates.length > 0 ? 'analyzing' : 'completed'
  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({
      status: nextStatus,
      checked_count: checked,
      candidate_count: candidates.length,
      processed_count: 0,
      saved_count: 0,
      failed_count: 0,
      latest_error: errors[0] || null,
      errors: appendErrors(job.errors, errors),
      completed_at: candidates.length > 0 ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to store scrape candidates')

  if (candidates.length === 0) {
    await writeSearchLog(supabase, data as ScrapeJob)
  }

  return data as ScrapeJob
}

function listingHasMajorAccident(listing: RawListing) {
  const accidentLower = (listing.accident_info || '').toLowerCase()
  return (
    accidentLower.includes('unfallschaden') ||
    accidentLower.includes('accident reported') ||
    accidentLower.includes('damaged')
  )
}

async function saveQualifiedLead(
  supabase: SupabaseServiceClient,
  listing: RawListing,
  analysis: NonNullable<Awaited<ReturnType<typeof analyzeCarWithGemini>>>
) {
  const { data, error } = await supabase
    .from('car_leads')
    .insert({
      date_found: todayIsoDate(),
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
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message || 'Failed to insert lead')
  return (data as { id: string }).id
}

async function processAnalysisChunk(supabase: SupabaseServiceClient, job: ScrapeJob) {
  const staleProcessingCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString()
  await supabase
    .from('scrape_job_items')
    .update({
      status: 'pending',
      error: 'Previous analysis step timed out; retrying.',
      updated_at: new Date().toISOString(),
    })
    .eq('job_id', job.id)
    .eq('status', 'processing')
    .lt('updated_at', staleProcessingCutoff)

  const { data: pendingItems, error } = await supabase
    .from('scrape_job_items')
    .select('*')
    .eq('job_id', job.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(getChunkSize())

  if (error) throw new Error(error.message)

  const items = (pendingItems || []) as Array<{
    id: string
    raw_listing: RawListing
    listing_url: string
  }>

  if (items.length === 0) return completeIfDone(supabase, job.id)

  for (const item of items) {
    await supabase
      .from('scrape_job_items')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', item.id)

    try {
      const listing = item.raw_listing
      const { data: existing } = await supabase
        .from('car_leads')
        .select('id')
        .eq('listing_url', listing.listing_url)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('scrape_job_items')
          .update({
            status: 'skipped',
            saved_lead_id: (existing as { id: string }).id,
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      const analysis = await analyzeCarWithGemini(listing)
      if (!analysis || !meetsLeadThreshold(analysis, listing.price) || listingHasMajorAccident(listing)) {
        await supabase
          .from('scrape_job_items')
          .update({
            status: 'skipped',
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        continue
      }

      const leadId = await saveQualifiedLead(supabase, listing, analysis)
      await supabase
        .from('scrape_job_items')
        .update({
          status: 'saved',
          saved_lead_id: leadId,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      await supabase
        .from('scrape_job_items')
        .update({
          status: 'failed',
          error: message,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      if (isGeminiAnalysisError(err)) {
        const failedJob = await failJob(supabase, job, message)
        return failedJob
      }
    }
  }

  return completeIfDone(supabase, job.id)
}

export async function runScrapeJobStep(jobId: string): Promise<ScrapeJobSummary> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) throw new Error(error?.message || 'Scrape job not found')

  let job = data as ScrapeJob
  if (job.status === 'completed' || job.status === 'failed') return toSummary(job)
  if (job.status === 'scraping') {
    if (!isStaleScrapingJob(job)) return toSummary(job)

    const { data: resetJob, error: resetError } = await supabase
      .from('scrape_jobs')
      .update({
        status: 'queued',
        latest_error: 'Previous scraping step timed out; retrying.',
        errors: appendErrors(job.errors, ['Previous scraping step timed out; retrying.']),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select('*')
      .single()

    if (resetError || !resetJob) throw new Error(resetError?.message || 'Failed to retry stale scrape job')
    job = resetJob as ScrapeJob
  }

  if (job.status === 'queued') {
    try {
      job = await discoverCandidates(supabase, job)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      job = await failJob(supabase, job, message)
      return toSummary(job)
    }
  }

  if (job.status === 'analyzing') {
    job = await processAnalysisChunk(supabase, job)
  }

  const refreshed = await getScrapeJob(job.id)
  return refreshed || toSummary(job)
}
