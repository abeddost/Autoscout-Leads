import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { CarLead } from '@/lib/supabase/types'
import StatsCards from '@/components/dashboard/StatsCards'
import LeadsTable from '@/components/dashboard/LeadsTable'
import FilterBar from '@/components/dashboard/FilterBar'
import ScrapeButton from '@/components/dashboard/ScrapeButton'

const PAGE_SIZE = 20

type SortColumn = 'date_found' | 'listing_date' | 'price' | 'model' | 'mileage' | 'deal_score'
const VALID_SORT_COLS: SortColumn[] = ['date_found', 'listing_date', 'price', 'model', 'mileage', 'deal_score']

interface SearchParams {
  page?: string
  brand?: string
  status?: string
  minScore?: string
  sortBy?: string
  sortDir?: string
  minPrice?: string
  maxPrice?: string
  modelSearch?: string
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const brand = params.brand || ''
  const status = params.status || ''
  const minScore = parseInt(params.minScore || '0', 10)
  const sortBy: SortColumn = VALID_SORT_COLS.includes(params.sortBy as SortColumn)
    ? (params.sortBy as SortColumn)
    : 'date_found'
  const sortDir = params.sortDir === 'asc' ? true : false // ascending = true
  const minPrice = parseFloat(params.minPrice || '0') || 0
  const maxPrice = parseFloat(params.maxPrice || '0') || 0
  const modelSearch = params.modelSearch?.trim() || ''

  const supabase = await createClient()

  // Build leads query
  let query = supabase
    .from('car_leads')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  // Secondary sort: always add deal_score as tiebreaker (unless already sorting by it)
  if (sortBy !== 'deal_score') {
    query = query.order('deal_score', { ascending: false })
  }

  if (brand) query = query.ilike('brand', `%${brand}%`)
  if (status) query = query.eq('status', status)
  if (minScore > 0) query = query.gte('deal_score', minScore)
  if (minPrice > 0) query = query.gte('price', minPrice)
  if (maxPrice > 0) query = query.lte('price', maxPrice)
  if (modelSearch) query = query.ilike('model', `%${modelSearch}%`)

  const { data: leadsRaw, count } = await query
  const leads = (leadsRaw || []) as CarLead[]

  // Stats queries
  const today = new Date().toISOString().split('T')[0]
  const [{ count: todayCount }, { data: statsRaw }] = await Promise.all([
    supabase
      .from('car_leads')
      .select('*', { count: 'exact', head: true })
      .eq('date_found', today),
    supabase
      .from('car_leads')
      .select('deal_score, potential_profit'),
  ])

  const statsRows = (statsRaw || []) as Pick<CarLead, 'deal_score' | 'potential_profit'>[]
  const scores = statsRows.map((r) => r.deal_score).filter(Boolean) as number[]
  const profits = statsRows.map((r) => r.potential_profit).filter((p): p is number => p != null && p > 0)

  const stats = {
    totalLeads: count || 0,
    todayLeads: todayCount || 0,
    avgDealScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestDealScore: scores.length ? Math.max(...scores) : 0,
    totalPotentialProfit: profits.reduce((a, b) => a + b, 0),
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Car Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Premium private car listings within 100 km of Bodenheim
          </p>
        </div>
        <ScrapeButton />
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {count || 0} Leads
          </h2>
        </div>
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      <LeadsTable
        leads={leads}
        page={page}
        totalCount={count || 0}
        pageSize={PAGE_SIZE}
        sortBy={sortBy}
        sortDir={sortDir ? 'asc' : 'desc'}
        currentParams={new URLSearchParams({
          ...(brand ? { brand } : {}),
          ...(status ? { status } : {}),
          ...(minScore > 0 ? { minScore: String(minScore) } : {}),
          ...(minPrice > 0 ? { minPrice: String(minPrice) } : {}),
          ...(maxPrice > 0 ? { maxPrice: String(maxPrice) } : {}),
          ...(modelSearch ? { modelSearch } : {}),
        }).toString()}
      />
    </div>
  )
}
