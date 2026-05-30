import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { CarLead } from '@/lib/supabase/types'
import StatsCards from '@/components/dashboard/StatsCards'
import LeadsTable from '@/components/dashboard/LeadsTable'
import FilterBar from '@/components/dashboard/FilterBar'
import ScrapeButton from '@/components/dashboard/ScrapeButton'

const PAGE_SIZE = 20

interface SearchParams {
  page?: string
  brand?: string
  status?: string
  minScore?: string
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

  const supabase = await createClient()

  // Build leads query
  let query = supabase
    .from('car_leads')
    .select('*', { count: 'exact' })
    .order('date_found', { ascending: false })
    .order('deal_score', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (brand) query = query.ilike('brand', `%${brand}%`)
  if (status) query = query.eq('status', status)
  if (minScore > 0) query = query.gte('deal_score', minScore)

  const { data: leadsRaw, count } = await query
  const leads = (leadsRaw || []) as CarLead[]

  // Stats queries
  const today = new Date().toISOString().split('T')[0]
  const [{ count: todayCount }, { data: statsData }] = await Promise.all([
    supabase
      .from('car_leads')
      .select('*', { count: 'exact', head: true })
      .eq('date_found', today),
    supabase
      .from('car_leads')
      .select('deal_score, potential_profit'),
  ])

  const statsRows = (statsData || []) as Pick<CarLead, 'deal_score' | 'potential_profit'>[]
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

      {/* Filters + Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            {count || 0} Leads
          </h2>
          <Suspense>
            <FilterBar />
          </Suspense>
        </div>
      </div>

      <LeadsTable
        leads={leads}
        page={page}
        totalCount={count || 0}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
